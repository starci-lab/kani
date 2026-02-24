import {
    EventEmitterService, EventName, 
    TokenPriceUpdatedEventPayload
} from "@modules/event"
import {
    Injectable 
} from "@nestjs/common"
import {
    OnEvent 
} from "@nestjs/event-emitter"

/**
 * Service for computing TWAP.
 */
@Injectable()
export class TwapCalculationService {
    constructor(
        private readonly eventEmitterService: EventEmitterService,
    ) {
    }

    /**
     * Handles the token price updated event.
     * @param payload - The payload of the token price updated event.
     * @param payload.id - The ID of the token.
     * @param payload.price - The price of the token.
     * @param payload.marketListingId - The market listing ID of the token.
     */
    @OnEvent(EventName.TokenPriceUpdated)
    async handleTokenPriceUpdated(
        payload: TokenPriceUpdatedEventPayload
    ) {
        const { id, price, marketListingId } = payload
        console.log(id,
            price,
            marketListingId)
    }
}