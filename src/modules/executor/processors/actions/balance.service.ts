import { BalanceService } from "@modules/blockchains"
import { BotSchema } from "@modules/databases"
import { envConfig } from "@modules/env"
import { MutexService, getMutexKey, MutexKey } from "@modules/lock"
import { Injectable, Scope, Inject } from "@nestjs/common"
import { REQUEST } from "@nestjs/core"
import { Mutex } from "async-mutex"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { createReadinessWatcherName, ReadinessWatcherFactoryService } from "@modules/mixin"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { createEventName, EventName } from "@modules/event"

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
        @InjectWinston()
        private readonly logger: WinstonLogger,
        private readonly mutexService: MutexService,
        private readonly balanceService: BalanceService,
        private readonly eventEmitter: EventEmitter2,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) {}

    // Initializes the processor and registers periodic balance evaluation logic.
    // Called when a new request-scoped processor instance is created.
    async initialize() {
        this.readinessWatcherFactoryService.createWatcher(
            createReadinessWatcherName(BalanceProcessorService.name, {
                botId: this.request.botId,
            }))
        // Ensure mutex exists for this bot
        this.mutex = this.mutexService.mutex(
            getMutexKey(MutexKey.Action, this.request.botId),
        )
        this.eventEmitter.on(
            createEventName(
                EventName.ActiveBotUpdated, {
                    botId: this.request.botId,
                }
            ),
            async (payload: BotSchema) => {
                this.bot = payload
            }
        )
        // Periodic evaluation cycle
        const executeBalanceRebalancing = async () => {
            try {
                if (this.mutex.isLocked()) {
                    return
                }
                await this.mutex.runExclusive(
                    async () => {
                        if (!this.bot) {
                            return
                        }
                        if (!this.bot.activePosition) {
                            return
                        }
                        await this.balanceService.executeBalanceRebalancing({
                            bot: this.bot,
                            withoutSnapshot: false,
                        })
                    })
            } catch (error) {
                console.error(error)
                this.logger.error(
                    WinstonLog.BalanceRebalancingFailed, {
                        botId: this.request.botId,
                        error: error.message,
                    })
            }
        }
        setInterval(
            executeBalanceRebalancing,
            envConfig().botExecutor.balanceEvaluationInterval,
        )
        this.readinessWatcherFactoryService.setReady(
            createReadinessWatcherName(BalanceProcessorService.name, {
                botId: this.request.botId,
            }))
    }
}

export interface BalanceProcessorRequest {
    botId: string
}