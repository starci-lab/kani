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
import { 
    createReadinessWatcherName, 
    ReadinessWatcherFactoryService 
} from "@modules/mixin"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"

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
    constructor(
        // The request object injected into this processor. It contains
        // the `user` instance for whom the processor is running.
        @Inject(REQUEST)
        private readonly request: ClosePositionProcessorRequest,

        // Used to manually subscribe to events. We bind listeners here instead
        // of using @OnEvent so Nest doesn't override our request context.
        private readonly eventEmitter: EventEmitter2,
        private readonly dispatchClosePositionService: DispatchClosePositionService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) {}

    // Register event listeners for this processor instance.
    // This lets every user have their own isolated event handling logic.
    async initialize() {
        this.readinessWatcherFactoryService.createWatcher(
            createReadinessWatcherName(ClosePositionProcessorService.name, {
                botId: this.request.botId,
            }))
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
                // do nothing if the position is not closed
            }
        )
        // register event listeners
        this.eventEmitter.on(
            EventName.InternalLiquidityPoolsFetched,
            async (
                payload: LiquidityPoolsFetchedEvent
            ) => {
                if (!this.bot || !this.bot.activePosition) {
                    return
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
                try {
                    await this.dispatchClosePositionService.dispatchClosePosition({
                        liquidityPoolId: payload.liquidityPoolId,
                        bot: this.bot,
                    })
                } catch (error) {
                    this.logger.error(WinstonLog.ClosePositionFailed, {
                        botId: this.bot.id,
                        error: error.message,
                        stack: error.stack,
                    })
                }
            }
        )
        this.eventEmitter.on(
            EventName.InternalDlmmLiquidityPoolsFetched,
            async (
                payload: DlmmLiquidityPoolsFetchedEvent
            ) => {
                if (!this.bot || !this.bot.activePosition) {
                    return
                }
                try {
                    await this.dispatchClosePositionService.dispatchClosePosition({
                        liquidityPoolId: payload.liquidityPoolId,
                        bot: this.bot,
                    })
                } catch (error) {
                    this.logger.error(WinstonLog.ClosePositionFailed, {
                        botId: this.bot.id,
                        error: error.message,
                        stack: error.stack,
                    })
                }
            }
        )
        this.readinessWatcherFactoryService.setReady(
            createReadinessWatcherName(ClosePositionProcessorService.name, {
                botId: this.request.botId,
            }))
    }
}

export interface ClosePositionProcessorRequest {
    botId: string
}