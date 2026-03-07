import {
    Injectable,
    OnModuleInit,
} from "@nestjs/common"
import {
    MarketListingId,
    PricePoint,
    PrimaryInfluxdbPriceBucketService,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    LokiJSService,
    AsyncService,
    RetryService,
} from "@modules/mixin"
import {
    Collection,
} from "lokijs"
import {
    QueryAndStoreParams,
} from "./types"
import {
    Interval 
} from "@nestjs/schedule"
import {
    envConfig 
} from "@modules/env"

/**
 * Service for storing price points in memory.
 */
@Injectable()
export class PricePointStorageService implements OnModuleInit {
    private pricePointsCollection: Collection<PricePoint>

    constructor(
        private readonly primaryInfluxdbPriceBucketService: PrimaryInfluxdbPriceBucketService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly lokiJSService: LokiJSService,
        private readonly asyncService: AsyncService,
        private readonly retryService: RetryService,
    ) {
    }

    /**
     * Initialize the price points collection.
     */
    async onModuleInit(): Promise<void> {
        this.pricePointsCollection = await this.lokiJSService.createCollection<PricePoint>(
            {
                name: "price-points-storage",
                options: {
                    indices: [
                        "id",
                        "market_listing_id",
                        "time"
                    ],
                },
            }
        )
    }

    /**
     * Store all price points for all tokens and market listings in memory.
     */
    @Interval(envConfig().inspector.priceWindow.storage.queryIntervalMs)
    async handleQueryAndStoreInterval(): Promise<void> {
        // Clear existing price points
        this.pricePointsCollection.clear()
        // Get all tokens and market listings
        const tokens = this.primaryMemoryStorageService.tokenCollection.find()
        // Loop through all tokens
        const promises: Array<Promise<void>> = []
        for (const token of tokens) {
            // Loop through all market listings for each token
            for (const marketListing of token.marketListings) {
                // Query price points from InfluxDB
                promises.push(
                    this.retryService.retry(
                        {
                            action: async () => {
                                await this.queryAndStore(
                                    {
                                        id: token.id,
                                        intervalMs: envConfig().inspector.priceWindow.intervalMs,
                                        marketListingId: marketListing.id,  
                                    }
                                )
                            },
                        }
                    )
                )
                
            }
        }
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Query and store the price points for a specific token and market listing in memory.
     */
    async queryAndStore(
        {
            id,
            intervalMs,
            marketListingId,
        }: QueryAndStoreParams,
    ): Promise<void> {
        const pricePoints = await this.primaryInfluxdbPriceBucketService.queryPromise({
            id,
            intervalMs,
            marketListingId,
        })
        if (pricePoints.length > 0) {
            // Remove existing price points for this token and market listing
            this.pricePointsCollection.findAndRemove(
                {
                    id: {
                        $eq: id 
                    },
                    market_listing_id: {
                        $eq: marketListingId 
                    },
                }
            )
            // Insert new price points
            this.pricePointsCollection.insert(pricePoints)
        }
    }

    /**
     * Get price points from memory for a specific token and market listing.
     */
    getPricePoints(
        id: string, 
        marketListingId: MarketListingId
    ): Array<PricePoint> {
        return this.pricePointsCollection.find(
            {
                id: {
                    $eq: id 
                },
                market_listing_id: {
                    $eq: marketListingId 
                },
            }
        )
    }
}
