import { EventName, LiquidityPoolsFetchedEvent } from "@modules/event"
import { Injectable } from "@nestjs/common"
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter"

@Injectable()
export class DexSubscriptionService {
    constructor(
        private readonly eventEmitter: EventEmitter2,
    ) {}
    
    @OnEvent(EventName.LiquidityPoolsFetched)
    async handleLiquidityPoolsFetched(
        event: LiquidityPoolsFetchedEvent
    ) {
        this.eventEmitter
            .emit(EventName.InternalLiquidityPoolsFetched, event)
    }
}