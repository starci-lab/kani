import {
    EventName, 
    TokenPriceUpdatedEventPayload
} from "@modules/event"
import {
    Injectable 
} from "@nestjs/common"
import {
    OnEvent 
} from "@nestjs/event-emitter"
import {
    PrimaryInfluxdbPriceBucketService
} from "@modules/databases"

/**
 * Service for computing TWAP.
 */
@Injectable()
export class TwapCalculationService {
    constructor(
        private readonly primaryInfluxdbPriceBucketService: PrimaryInfluxdbPriceBucketService,
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
        await this.primaryInfluxdbPriceBucketService.write(
            {
                id,
                price,
                marketListingId,
            }
        )
    }
}