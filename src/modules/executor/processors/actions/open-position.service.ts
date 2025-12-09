import { Inject, Injectable, Scope } from "@nestjs/common"
import { 
    createEventName, 
    DlmmLiquidityPoolsFetchedEvent, 
    EventName, 
    LiquidityPoolsFetchedEvent 
} from "@modules/event"
import { REQUEST } from "@nestjs/core"
import { BotSchema } from "@modules/databases"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { DispatchOpenPositionService } from "@modules/blockchains"
import { createReadinessWatcherName, ReadinessWatcherFactoryService } from "@modules/mixin"

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
export class OpenPositionProcessorService  {
    private bot: BotSchema
    constructor(
        // The request object injected into this processor. It contains
        // the `user` instance for whom the processor is running.
        @Inject(REQUEST)
        private readonly request: OpenPositionProcessorRequest,
        // Used to manually subscribe to events. We bind listeners here instead
        // of using @OnEvent so Nest doesn't override our request context.
        private readonly eventEmitter: EventEmitter2,
        // inject the connection to the database
        private readonly dispatchOpenPositionService: DispatchOpenPositionService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) {}

    // Register event listeners for this processor instance.
    // This lets every user have their own isolated event handling logic.
    async initialize() {
        this.readinessWatcherFactoryService.createWatcher(
            createReadinessWatcherName(OpenPositionProcessorService.name, {
                botId: this.request.botId,
            }))
        this.eventEmitter.on(
            createEventName(
                EventName.ActiveBotUpdated, {
                    botId: this.request.botId,
                }),
            async (payload: BotSchema) => {
                this.bot = payload
            }
        )   
        this.eventEmitter.on(
            createEventName(
                EventName.PositionOpened, {
                    botId: this.request.botId,
                }),
            async () => {
                // do nothing
            }
        )
        // register event listeners
        this.eventEmitter.on(
            createEventName(
                EventName.DistributedLiquidityPoolsFetched, {
                    botId: this.request.botId,
                }),
            async (payload: LiquidityPoolsFetchedEvent) => {
                if (!this.bot) {
                    return
                }
                await this.dispatchOpenPositionService.dispatchOpenPosition({
                    liquidityPoolId: payload.liquidityPoolId,
                    bot: this.bot,
                })
            
            }
        )
        this.eventEmitter.on(
            createEventName(
                EventName.DistributedDlmmLiquidityPoolsFetched, 
                {
                    botId: this.request.botId,
                }),
            async (payload: DlmmLiquidityPoolsFetchedEvent) => {
                if (!this.bot) {
                    return
                }
                // run the open position
                await this.dispatchOpenPositionService.dispatchOpenPosition({
                    liquidityPoolId: payload.liquidityPoolId,
                    bot: this.bot,
                })
            }
        )
        this.readinessWatcherFactoryService.setReady(
            createReadinessWatcherName(OpenPositionProcessorService.name, {
                botId: this.request.botId,
            }))
    }
}

export interface OpenPositionProcessorRequest {
    botId: string
}