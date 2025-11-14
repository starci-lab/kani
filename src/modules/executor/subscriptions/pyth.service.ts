import { Injectable } from "@nestjs/common"
import { OnEvent } from "@nestjs/event-emitter"
import { EventName, WsPythLastPricesUpdatedEvent } from "@modules/event"

@Injectable()
export class PythSubscriptionService {
    @OnEvent(EventName.WsPythLastPricesUpdated)
    async handlePythLastPricesUpdated(event: WsPythLastPricesUpdatedEvent) {
        console.log(event)
    }
}   