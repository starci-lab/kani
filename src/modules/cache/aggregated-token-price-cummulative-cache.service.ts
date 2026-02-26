import {
    Injectable 
} from "@nestjs/common"
import {
    DayjsService 
} from "@modules/mixin"
import {
    AggregatedTokenPriceCummulativeNotFoundException
} from "@modules/exceptions"
import {
    CacheService 
} from "./cache.service"
import {
    CacheKey 
} from "./enums"
import Decimal from "decimal.js"
import type {
    AggregatedTokenPriceCacheResult,
    AggregatedTokenPriceCummulativeCacheResult,
    CreateInitialCacheResultParams, 
    SetAggregatedTokenPriceCummulativeParams,
    UpsertLastPriceParams
} from "./types"

/** Service for managing aggregated token price cummulative in cache. */
@Injectable()
export class AggregatedTokenPriceCummulativeCacheService {
    constructor(
    private readonly cacheService: CacheService,
    private readonly dayjsService: DayjsService,
    ) {}

    /**
     * Sets or updates aggregated token price cummulative for a market listing in cache.
     * @param params - The parameters for setting aggregated token price cummulative.
     * @param params.id - The id of the aggregated token price cummulative.
     * @param params.price - The price of the token.
     * @param params.marketListingId - The market listing id.
     * @param params.intervalMs - The interval in milliseconds.
     */
    async set({
        id,
        price,
        marketListingId,
        intervalMs,
    }: SetAggregatedTokenPriceCummulativeParams): Promise<void> {
        // Get the current time
        const now = this.dayjsService.now()
        // Get the cached result
        let cacheResult = await this.cacheService.get({
            key: CacheKey.AggregatedTokenPriceCummulative,
            args: [id],
        })

        // If the cached result is not found, create a new one
        if (!cacheResult) {
            cacheResult = this.createInitialCacheResult({
                now,
                price,
                marketListingId,
            })

            await this.cacheService.set({
                key: CacheKey.AggregatedTokenPriceCummulative,
                args: [id],
                cacheResult,
            })
            return
        }

        const lastSnapshotAt = cacheResult.lastAggregatedTokenPrice.snapshotAt
        const dtMs = now.diff(lastSnapshotAt,
            "milliseconds")

        // Case 1: still within interval => update last record only
        if (dtMs < intervalMs) {
            this.upsertLastPrice(cacheResult.lastAggregatedTokenPrice,
                {
                    now,
                    price,
                    marketListingId,
                })

            // keep top-level snapshotAt consistent (optional)
            cacheResult.snapshotAt = now

            await this.cacheService.set({
                key: CacheKey.AggregatedTokenPriceCummulative,
                args: [id],
                cacheResult,
            })
            return
        }

        // Case 2: vượt interval => accumulate using last price, then reset lastAggregatedTokenPrice
        const lastPrice =
      cacheResult.lastAggregatedTokenPrice.prices?.[marketListingId]?.price ?? 0

        // cumulative += Δt * lastPrice (Δt in ms)
        cacheResult.cummulativePrice = cacheResult.cummulativePrice.add(
            new Decimal(lastPrice).mul(dtMs),
        )

        // reset lastAggregatedTokenPrice to current price at "now"
        cacheResult.lastAggregatedTokenPrice = {
            prices: {
                [marketListingId]: {
                    price,
                    snapshotAt: now,
                },
            },
            snapshotAt: now,
        } satisfies AggregatedTokenPriceCacheResult

        cacheResult.snapshotAt = now

        await this.cacheService.set({
            key: CacheKey.AggregatedTokenPriceCummulative,
            args: [id],
            cacheResult,
        })
    }

    /**
     * Creates initial cache result.
     * @param params - The parameters for creating initial cache result.
     * @param params.now - The current time.
     * @param params.price - The price of the token.
     * @param params.marketListingId - The market listing id.
     * @returns The initial cache result.
     */
    private createInitialCacheResult({
        now,
        price,
        marketListingId,
    }: CreateInitialCacheResultParams): AggregatedTokenPriceCummulativeCacheResult {
        return {
            snapshotAt: now,
            cummulativePrice: new Decimal(0),
            startAt: now,
            lastAggregatedTokenPrice: {
                prices: {
                    [marketListingId]: {
                        price,
                        snapshotAt: now,
                    },
                },
                snapshotAt: now,
            },
        } as AggregatedTokenPriceCummulativeCacheResult
    }

    /**
     * Upserts the last price.
     * @param last - The last price.
     * @param params - The parameters for upserting the last price.
     * @param params.now - The current time.
     * @param params.price - The price of the token.
     * @param params.marketListingId - The market listing id.
     */
    private upsertLastPrice(
        last: AggregatedTokenPriceCacheResult,
        {
            now,
            price,
            marketListingId,
        }: UpsertLastPriceParams,
    ) {
        if (!last.prices) last.prices = {
        }
        last.prices[marketListingId] = {
            price,
            snapshotAt: now,
        }
        // keep last snapshotAt updated to the latest touch time
        last.snapshotAt = now
    }

    /**
     * Gets the aggregated token price cummulative for a market listing in cache.
     * @param id - The id of the aggregated token price cummulative.
     * @returns The aggregated token price cummulative.
     */
    async get(id: string): Promise<AggregatedTokenPriceCummulativeCacheResult> {
        const cacheResult = await this.cacheService.get({
            key: CacheKey.AggregatedTokenPriceCummulative,
            args: [id],
        })
        if (!cacheResult) {
            throw new AggregatedTokenPriceCummulativeNotFoundException({
                id,
            })
        }
        return cacheResult
    }
}