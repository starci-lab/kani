import { EventName, LiquidityPoolsFetchedEvent } from "@modules/event"
import { Injectable } from "@nestjs/common"
import { OnEvent } from "@nestjs/event-emitter"

@Injectable()
export class DexSubscriptionService {
    @OnEvent(EventName.LiquidityPoolsFetched)
    async handleLiquidityPoolsFetched(event: LiquidityPoolsFetchedEvent) {
        console.log(event)
    }
}