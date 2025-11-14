import { EventEmitterService, EventName, LiquidityPoolsFetchedEvent } from "@modules/event"
import { Injectable } from "@nestjs/common"
import { OnEvent } from "@nestjs/event-emitter"

@Injectable()
export class DexSubscriptionService {
    constructor(
        private readonly eventEmitterService: EventEmitterService,
    ) {}
    @OnEvent(EventName.LiquidityPoolsFetched)
    async handleLiquidityPoolsFetched(
        event: LiquidityPoolsFetchedEvent
    ) {
        this.eventEmitterService
            .emit<LiquidityPoolsFetchedEvent>(
                EventName.InternalLiquidityPoolsFetched,
                event,
                {
                    withoutKafka: true,
                }
            )
    }
}