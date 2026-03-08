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
<<<<<<< HEAD
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
=======
        // create the price points collection
        this.pricePointsCollection = await this.lokiJSService.createCollection<PricePoint>({
            name: "price-points-storage",
            options: {
                indices: [
                    "id",
                    "market_listing_id",
                    "time"
                ],
            },
        })
>>>>>>> ba6b7fd68a6ce62640260fcb799528f2e848ab4a
    }

    /**
     * Store all price points for all tokens and market listings in memory.
     */
    @Interval(envConfig().inspector.priceWindow.storage.queryIntervalMs)
    async handleQueryAndStoreInterval(): Promise<void> {
        // clear existing price points
        this.pricePointsCollection.clear()
<<<<<<< HEAD
        // Get all tokens and market listings
=======
        // get all tokens
>>>>>>> ba6b7fd68a6ce62640260fcb799528f2e848ab4a
        const tokens = this.primaryMemoryStorageService.tokenCollection.find()
        // Loop through all tokens
        const promises: Array<Promise<void>> = []
        for (const token of tokens) {
            // Loop through all market listings for each token
            for (const marketListing of token.marketListings) {
<<<<<<< HEAD
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
=======
                if (marketListing.isSignal) {
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
>>>>>>> ba6b7fd68a6ce62640260fcb799528f2e848ab4a
                    )
                }
            }
        }
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Query and store the price points for a specific token and market listing in memory.
     * @param id - The ID of the token.
     * @param intervalMs - The interval in milliseconds.
     * @param marketListingId - The ID of the market listing.
     */
    async queryAndStore(
        {
            id,
            intervalMs,
            marketListingId,
        }: QueryAndStoreParams,
    ): Promise<void> {
<<<<<<< HEAD
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
=======
        // query the price points from the primary influxdb price bucket
        const pricePoints = await this.primaryInfluxdbPriceBucketService.queryPromise(
            {
                id,
                intervalMs,
                marketListingId,
            }
        )
        // remove existing price points for this token and market listing
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
        // insert new price points
        this.pricePointsCollection.insert(pricePoints)
>>>>>>> ba6b7fd68a6ce62640260fcb799528f2e848ab4a
    }

    /**
     * Get price points from memory for a specific token and market listing.
     * @param id - The ID of the token.
     * @param marketListingId - The ID of the market listing.
     * @returns The price points.
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
