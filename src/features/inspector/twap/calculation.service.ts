import {
    CummulativeService 
} from "@modules/blockchains"
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
import {
    PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    TokenNotFoundException 
} from "@modules/exceptions"

/**
 * Service for computing TWAP.
 */
@Injectable()
export class TwapCalculationService {
    constructor(
        private readonly cummulativeService: CummulativeService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
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
        await this.cummulativeService.updateCummulativeSnapshot({
            id,
            price: price.toNumber(),
            marketListingId,
            intervalMs: envConfig().inspector.twap.intervalMs,
        })
        // check length of the array
        const token = this.primaryMemoryStorageService.tokenCollection.findOne({
            id,
        })
        if (!token) {
            throw new TokenNotFoundException({
                id,
            })
        }
        const cummulativePrice = await this.cummulativeService.resolveCummulativePrice(
            {
                token,
                intervalMs: envConfig().inspector.twap.intervalMs,
            }
        )
        console.log(cummulativePrice.price)
    }
}