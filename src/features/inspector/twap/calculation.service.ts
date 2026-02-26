import {
    AggregatedTokenPriceCummulativeCacheService 
} from "@modules/cache"
import {
    envConfig 
} from "@modules/env"
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

/**
 * Service for computing TWAP.
 */
@Injectable()
export class TwapCalculationService {
    constructor(
        private readonly aggregatedTokenPriceCummulativeCacheService: AggregatedTokenPriceCummulativeCacheService,
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
        // push to aggregated token price array cache
        await this.aggregatedTokenPriceCummulativeCacheService.set({
            id,
            price: price.toNumber(),
            marketListingId,
            intervalMs: envConfig().inspector.twap.intervalMs,
        })
        // check length of the array
        const cummulativeCacheResult = await this.aggregatedTokenPriceCummulativeCacheService.get(id)
        console.log({
            cummulativePrice: cummulativeCacheResult.cummulativePrice.toNumber(),
            lastAggregatedTokenPrice: cummulativeCacheResult.lastAggregatedTokenPrice.prices?.[marketListingId]?.price,
            startAt: cummulativeCacheResult.startAt.toISOString(),
            snapshotAt: cummulativeCacheResult.snapshotAt.toISOString(),
        })
    }
}