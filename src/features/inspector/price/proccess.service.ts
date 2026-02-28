import {
    Injectable 
} from "@nestjs/common"
import {
    PriceCalculationService 
} from "./calculation.service"
import {
    MarketListingId,
    PrimaryMemoryStorageService, 
    TokenId
} from "@modules/databases"
import {
    ProccessPriceWindowParams 
} from "./types"
import {
    Interval 
} from "@nestjs/schedule"
import {
    envConfig 
} from "@modules/env"
import {
    AsyncService 
} from "@modules/mixin"
import {
    createObjectId 
} from "@modules/common"

/**
 * Service for proccessing price window.
 */
@Injectable()
export class PriceProccessService {
    constructor(
        /** The price calculation service. */
        private readonly priceCalculationService: PriceCalculationService,
        /** The primary memory storage service. */
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        /** The async service. */
        private readonly asyncService: AsyncService,
    ) {}

    /**
     * Handle the price window interval.
     */
    @Interval(500)
    async handlePriceWindowInterval() {
        const promises: Array<Promise<void>> = []
        const tokens = this.primaryMemoryStorageService.tokenCollection.find()
        for (const token of tokens) {
            for (const marketListing of token.marketListings) {
                promises.push(
                    this.proccessPriceWindow({
                        id: token.id,
                        intervalMs: envConfig().inspector.priceWindow.intervalMs,
                        marketListingId: marketListing.id,
                    })
                )
            }
        }
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Proccess the price window.
     */
    async proccessPriceWindow(
        { id, intervalMs, marketListingId }: ProccessPriceWindowParams,
    ): Promise<void> {
        const result = await this.priceCalculationService.analyzePriceWindow(
            {
                id, 
                intervalMs, 
                marketListingId 
            }
        )
        if (!result) {
            throw new Error("Failed to analyze price window")
        }
        if (id === createObjectId(TokenId.SuiIka).toString() && marketListingId === MarketListingId.Pyth) {
            console.log("Sui IKA: ",
                result)
        }
    }
}       