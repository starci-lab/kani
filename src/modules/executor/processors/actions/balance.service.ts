import { BotNotFoundException } from "@exceptions"
import { BalanceService } from "@modules/blockchains"
import { BotSchema, InjectPrimaryMongoose, PositionSchema } from "@modules/databases"
import { envConfig } from "@modules/env"
import { MutexService, getMutexKey, MutexKey } from "@modules/lock"
import { Injectable, Scope, Inject } from "@nestjs/common"
import { REQUEST } from "@nestjs/core"
import { Mutex } from "async-mutex"
import { Connection } from "mongoose"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"

// BalanceProcessorService
// This processor is responsible for monitoring a bot's balances and evaluating
// whether its token allocations remain within safe operating ranges.
//
// It runs in a request-scoped DI context so each bot gets its own isolated
// processor instance and internal state. With `durable: true`, NestJS reuses
// the same processor across events that belong to the same logical bot context.
//
// The processor periodically triggers balance evaluation cycles. Each cycle
// fetches the bot’s primary-token, quote-token, and gas-token balances,
// computes the current ratios, and determines whether the bot is eligible

// to continue operating or requires rebalancing.
@Injectable({
    scope: Scope.REQUEST,
    durable: true,
})
export class BalanceProcessorService  {
    private bot: BotSchema
    private mutex: Mutex

    constructor(
        @Inject(REQUEST)
        private readonly request: BalanceProcessorRequest,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectWinston()
        private readonly logger: WinstonLogger,
        private readonly mutexService: MutexService,
        private readonly balanceService: BalanceService,
    ) {}

    // Initializes the processor and registers periodic balance evaluation logic.
    // Called when a new request-scoped processor instance is created.
    async initialize() {
        // Ensure mutex exists for this bot
        this.mutex = this.mutexService.mutex(
            getMutexKey(MutexKey.Action, this.request.bot.id),
        )
        // Periodic evaluation cycle
        const executeBalanceRebalancing = async () => {
            try {
                if (this.mutex.isLocked()) {
                    return
                }
                await this.mutex.runExclusive(async () => {
                    // Refresh bot data from the database
                    const bot = await this.connection
                        .model<BotSchema>(BotSchema.name)
                        .findById(this.request.bot.id)

                    if (!bot) {
                        throw new BotNotFoundException(
                            `Bot not found with id: ${this.request.bot.id}`,
                        )
                    }
                    this.bot = bot.toJSON()
                    const activePosition = await this.connection
                        .model<PositionSchema>(PositionSchema.name).findOne({
                            bot: this.bot.id,
                            isActive: true,
                        })
                    this.bot.activePosition = activePosition?.toJSON()
                    await this.balanceService.executeBalanceRebalancing({
                        bot: this.bot,
                        withoutSnapshot: false,
                    })
                })
            } catch (error) {
                this.logger.error(
                    WinstonLog.BalanceRebalancingFailed, {
                        botId: this.request.bot.id,
                        error: error.message,
                    })
            }
        }
        // Run immediately and then at a fixed interval
        executeBalanceRebalancing()
        setInterval(
            executeBalanceRebalancing,
            envConfig().botExecutor.balanceEvaluationInterval,
        )
    }
}

export interface BalanceProcessorRequest {
    bot: BotSchema
}