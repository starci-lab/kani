import { Injectable } from "@nestjs/common"
import { OnEvent } from "@nestjs/event-emitter"
import { EventName, WsCexLastPricesUpdatedEvent, WsCexOrderBookUpdatedEvent } from "@modules/event"

@Injectable()
export class CexSubscriptionService {
    @OnEvent(EventName.WsCexLastPricesUpdated)
    async handleCexLastPricesUpdated(payload: WsCexLastPricesUpdatedEvent) {
        console.log(payload)
    }

    @OnEvent(EventName.WsCexOrderBookUpdated)
    async handleCexOrderBookUpdated(event: WsCexOrderBookUpdatedEvent) {
        console.log(event)
    }
}