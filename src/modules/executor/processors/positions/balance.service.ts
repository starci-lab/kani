import { BotNotFoundException } from "@exceptions"
import { DispatchOpenPositionService, BalanceService } from "@modules/blockchains"
import { BotSchema, InjectPrimaryMongoose } from "@modules/databases"
import { envConfig } from "@modules/env"
import { MutexService, getMutexKey, MutexKey } from "@modules/lock"
import { Injectable, Scope, Inject } from "@nestjs/common"
import { REQUEST } from "@nestjs/core"
import { Mutex } from "async-mutex"
import { Connection } from "mongoose"

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
        private readonly dispatchOpenPositionService: DispatchOpenPositionService,
        private readonly mutexService: MutexService,
        private readonly balanceService: BalanceService,
    ) {}

    // Initializes the processor and registers periodic balance evaluation logic.
    // Called when a new request-scoped processor instance is created.
    async initialize() {
        // Ensure mutex exists for this bot
        this.mutex = this.mutexService.mutex(
            getMutexKey(MutexKey.Balance, this.request.bot.id),
        )
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
        // Periodic evaluation cycle
        const runBalanceEvaluation = async () => {
            const result = await this.balanceService.evaluateBotBalances({
                bot: this.bot,
            })
            console.log({
                status: result.status,
                targetBalanceAmount: result.targetBalanceAmount?.toString(),
                quoteBalanceAmount: result.quoteBalanceAmount?.toString(),
                gasBalanceAmount: result.gasBalanceAmount?.toString(),
                targetBalanceAmountSwapToQuote: result.targetBalanceAmountSwapToQuote?.toString(),
                targetBalanceAmountSwapToGas: result.targetBalanceAmountSwapToGas?.toString(),
            })
        }
        // Run immediately and then at a fixed interval
        runBalanceEvaluation()
        setInterval(
            runBalanceEvaluation,
            envConfig().botExecutor.balanceEvaluationInterval,
        )
    }
}

export interface BalanceProcessorRequest {
    bot: BotSchema
}