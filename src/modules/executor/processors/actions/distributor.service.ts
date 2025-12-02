import { BotSchema } from "@modules/databases"
import { 
    createEventName, 
    DlmmLiquidityPoolsFetchedEvent, 
    EventName, 
    LiquidityPoolsFetchedEvent
} from "@modules/event"
import { Inject, Injectable, Scope } from "@nestjs/common"
import { REQUEST } from "@nestjs/core"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { Mutex } from "async-mutex"

@Injectable({
    scope: Scope.REQUEST,
    durable: true,
})
export class DistributorProcessorService {
    private mutex: Mutex
    constructor(
        // The request object injected into this processor. It contains
        // the `user` instance for whom the processor is running.
        @Inject(REQUEST)
        private readonly request: DistributorProcessorRequest,
        private readonly eventEmitter: EventEmitter2,
    ) {}    

    async initialize() {
        this.eventEmitter.on(
            EventName.InternalDlmmLiquidityPoolsFetched,
            async (payload: DlmmLiquidityPoolsFetchedEvent) => {
                this.eventEmitter.emit(
                    createEventName(
                        EventName.DistributedDlmmLiquidityPoolsFetched, {
                            botId: this.request.bot.id,
                        }),
                    payload,
                )
            })
        this.eventEmitter.on(
            EventName.InternalLiquidityPoolsFetched,
            async (payload: LiquidityPoolsFetchedEvent) => {
                this.eventEmitter.emit(
                    createEventName(
                        EventName.DistributedLiquidityPoolsFetched, {
                            botId: this.request.bot.id,
                        }),
                    payload,
                )
            })
    }
}

export interface DistributorProcessorRequest {
    bot: BotSchema
}