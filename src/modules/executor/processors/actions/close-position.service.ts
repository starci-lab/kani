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
import { 
    createReadinessWatcherName, 
    ReadinessWatcherFactoryService 
} from "@modules/mixin"

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
                await this.dispatchClosePositionService.dispatchClosePosition({
                    liquidityPoolId: payload.liquidityPoolId,
                    bot: this.bot,
                })
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
                await this.dispatchClosePositionService.dispatchClosePosition({
                    liquidityPoolId: payload.liquidityPoolId,
                    bot: this.bot,
                })
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