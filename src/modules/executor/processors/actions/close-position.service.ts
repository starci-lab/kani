import { Inject, Injectable, Scope } from "@nestjs/common"
import { 
    createEventName, 
    DlmmLiquidityPoolsFetchedEvent, 
    EventName, 
    LiquidityPoolsFetchedEvent 
} from "@modules/event"
import { REQUEST } from "@nestjs/core"
import { 
    BotSchema, 
} from "@modules/databases"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { DispatchClosePositionService } from "@modules/blockchains"
import { createObjectId } from "@utils"
import { getMutexKey, MutexKey, MutexService } from "@modules/lock"
import { Mutex } from "async-mutex"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { DayjsService, MsService, ReadinessWatcherFactoryService } from "@modules/mixin"
import { Dayjs } from "dayjs"
import { CLOSE_POSITION_INTERVAL } from "./constants"
import { Decimal } from "decimal.js"

// open position processor service is to process the open position of the liquidity pools
// to determine if a liquidity pool is eligible to open a position
// OpenPositionProcessorService
// This class handles all logic related to opening positions for a specific user.
// It runs inside its own request-scoped DI context so each processor instance
// gets its own `bot` state. Using `durable: true` allows Nest to reuse this
// processor across events that belong to the same logical bot context”.

@Injectable({
    scope: Scope.REQUEST,
    durable: true,
})
export class ClosePositionProcessorService {
    private bot: BotSchema
    private mutex: Mutex
    private lastClosedPositionAt: Dayjs | null = null
    constructor(
        // The request object injected into this processor. It contains
        // the `user` instance for whom the processor is running.
        @Inject(REQUEST)
        private readonly request: ClosePositionProcessorRequest,

        // Used to manually subscribe to events. We bind listeners here instead
        // of using @OnEvent so Nest doesn't override our request context.
        private readonly eventEmitter: EventEmitter2,
        private readonly dispatchClosePositionService: DispatchClosePositionService,
        private readonly mutexService: MutexService,
        private readonly dayjsService: DayjsService,
        private readonly msService: MsService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) {}

    // Register event listeners for this processor instance.
    // This lets every user have their own isolated event handling logic.
    async initialize() {
        this.readinessWatcherFactoryService.createWatcher(ClosePositionProcessorService.name)
        // whenever the active bot is updated, we update the active bot instance
        this.eventEmitter.on(
            createEventName(
                EventName.ActiveBotUpdated, 
                {
                    botId: this.request.botId,
                }
            ),
            async (payload: BotSchema) => {
                this.bot = payload
            }
        )
        this.eventEmitter.on(
            createEventName(
                EventName.PositionClosed, {
                    botId: this.request.botId,
                }),
            async () => {
                this.lastClosedPositionAt = this.dayjsService.now()
            }
        )
        // register event listeners
        this.eventEmitter.on(
            EventName.InternalLiquidityPoolsFetched,
            async (
                payload: LiquidityPoolsFetchedEvent
            ) => {
                if (!this.bot) {
                    return
                }
                // if the bot has been closed position recently, we skip the close position
                if (
                    this.lastClosedPositionAt 
                )
                {
                    if (
                        this.lastClosedPositionAt.diff(this.dayjsService.now(), "millisecond") 
                        < this.msService.fromString(CLOSE_POSITION_INTERVAL)
                    ) {
                        return
                    }
                }
                // only run if the liquidity pool is belong to the bot
                if (
                    this.bot.activePosition?.liquidityPool.toString() 
                    !== createObjectId(payload.liquidityPoolId).toString()
                )
                {
                    // skip if the liquidity pool is not belong to the active position
                    return
                }
                this.mutex = this.mutexService.mutex(
                    getMutexKey(
                        MutexKey.Action, 
                        this.request.botId
                    )
                )
                // run the open position
                if (this.mutex.isLocked()) {
                    return
                }
                await this.mutex.runExclusive(
                    async () => {
                        try {
                            return await this.dispatchClosePositionService.dispatchClosePosition({
                                liquidityPoolId: payload.liquidityPoolId,
                                bot: this.bot,
                            })
                        } catch (error) {
                            this.logger.error(
                                WinstonLog.ClosePositionFailed, {
                                    botId: this.request.botId,
                                    liquidityPoolId: payload.liquidityPoolId,
                                    error: error.message,
                                })
                        }
                    })
            }
        )
        this.eventEmitter.on(
            EventName.InternalDlmmLiquidityPoolsFetched,
            async (
                payload: DlmmLiquidityPoolsFetchedEvent
            ) => {
                if (!this.bot) {
                    return
                }
                // if the bot has been closed position recently, we skip the close position
                if (
                    this.lastClosedPositionAt &&
                    new Decimal(
                        this.lastClosedPositionAt.diff(this.dayjsService.now(), "millisecond"
                        )).lt(
                        new Decimal(
                            this.msService.fromString(CLOSE_POSITION_INTERVAL)
                        )
                    )
                ) {
                    return
                }
                this.mutex = this.mutexService.mutex(
                    getMutexKey(
                        MutexKey.Action, 
                        this.request.botId
                    ))
                // define the target and quote tokens
                if (this.mutex.isLocked()) {
                    return
                }
                await this.mutex.runExclusive(
                    async () => {
                        try {
                            return await this.dispatchClosePositionService.dispatchClosePosition({
                                liquidityPoolId: payload.liquidityPoolId,
                                bot: this.bot,
                            })
                        } catch (error) {
                            this.logger.error(
                                WinstonLog.ClosePositionFailed, {
                                    botId: this.bot.id,
                                    liquidityPoolId: payload.liquidityPoolId,
                                    error: error.message,
                                })
                        }
                    })
            }
        )
        this.readinessWatcherFactoryService.setReady(ClosePositionProcessorService.name)
    }
}

export interface ClosePositionProcessorRequest {
    botId: string
}