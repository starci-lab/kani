import {
    Injectable,
} from "@nestjs/common"
import {
    envConfig,
} from "@modules/env"
import {
    AsyncService,
    DayjsService,
} from "@modules/mixin"
import {
    AggregatedTokenPriceNotFoundException,
    PriceByMarketPriorityNotResolvedException,
    TokenNotFoundException,
} from "@modules/exceptions"
import {
    AggregatedTokenPriceCacheResult,
    AggregatedTokenPriceTwapCacheResult,
    AggregatedTokenPriceTwapCacheService,
    CreateInitialCacheResultParams,
    SetAggregatedTokenPriceTwapParams,
    TwapSnapshot,
    UpsertLastPriceParams,
} from "@modules/cache"
import {
    ResolveTwapPriceParams,
    ResolveTwapPriceResult,
} from "./types"
import {
    PriceSelectionService,
} from "./price-selection.service"
import {
    PrimaryMemoryStorageService,
} from "@modules/databases"
import Decimal from "decimal.js"

/**
 * Service responsible for TWAP: updates price snapshots and resolves TWAP price.
 */
@Injectable()
export class TwapService {
    constructor(
        private readonly dayjsService: DayjsService,
        private readonly aggregatedTokenPriceTwapCacheService: AggregatedTokenPriceTwapCacheService,
        private readonly asyncService: AsyncService,
        private readonly priceSelectionService: PriceSelectionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) { }

    /**
     * Updates TWAP snapshots and last aggregated price map.
     *
     * @param param - Id, price, marketListingId, intervalMs
     * @returns Promise that resolves when cache is updated
     *
     * @example
     * await this.twapService.updateTwapSnapshot({ id, price, marketListingId, intervalMs })
     */
    async updateTwapSnapshot({
        id,
        price,
        marketListingId,
        intervalMs,
    }: SetAggregatedTokenPriceTwapParams): Promise<void> {
        // get the current time
        const now = this.dayjsService.now()

        // get the cache result
        let [cacheResult] = await this.asyncService.resolveTuple(
            this.aggregatedTokenPriceTwapCacheService.get(id),
        )

        // initialize the cache result if it doesn't exist
        if (!cacheResult) {
            cacheResult = this.createInitialCacheResult({
                now,
                price,
                marketListingId,
            })
        }

        // upsert the last aggregated token price
        const lastAggregatedTokenPrice = cacheResult.lastAggregatedTokenPrice
        // upsert the last aggregated token price
        this.upsertLastPrice(
            lastAggregatedTokenPrice,
            {
                now,
                price,
                marketListingId,
            },
        )
        // get the last snapshot at time
        const lastSnapshotAt = cacheResult.lastAggregatedTokenPrice.snapshotAt
        // get the difference in milliseconds between the current time and the last snapshot at time
        const dtMs = now.diff(
            lastSnapshotAt,
            "milliseconds",
        )

        // if the difference in milliseconds is less than the interval ms, return
        if (dtMs < intervalMs) {
            // set the cache result
            await this.aggregatedTokenPriceTwapCacheService.set(
                {
                    id,
                    cacheResult,
                }
            )
            return
        }

        // get the token
        const token = this.primaryMemoryStorageService.tokenCollection.findOne({
            id,
        })
        // if the token is not found, throw an exception
        if (!token) {
            throw new TokenNotFoundException({
                id,
            })
        }

        // resolve the price by market priority
        const resolvedPrice = this.priceSelectionService.resolveByMarketPriority({
            token,
            prices: lastAggregatedTokenPrice.prices,
            now,
            maxAgeMs: intervalMs,
            maxDeviationRatio: envConfig().price.deviationMaxRatio,
        })
        // if the resolved price is not found, throw an exception
        if (!resolvedPrice) {
            throw new PriceByMarketPriorityNotResolvedException({
                id: token.id,
            })
        }

        // create a new snapshot
        const newSnapshot: TwapSnapshot = {
            price: resolvedPrice.price,
            snapshotAt: now,
        }

        // get the maximum number of snapshots
        const maxSnapshots = envConfig().inspector.twap.maxSnapshots
        // update the snapshots
        cacheResult.snapshots = [
            ...cacheResult.snapshots,
            newSnapshot,
        ].slice(-maxSnapshots)
        // update the snapshot at time
        cacheResult.snapshotAt = now
        // set the cache result
        await this.aggregatedTokenPriceTwapCacheService.set({
            id,
            cacheResult: cacheResult,
        })
    }

    /**
     * Resolves the TWAP price for a token over the given window.
     *
     * @param param - token, intervalMs
     * @returns TWAP price with age and staleness
     *
     * @example
     * const result = await this.twapService.resolveTwapPrice({ token, intervalMs })
     */
    async resolveTwapPrice(
        {
            token,
            intervalMs,
        }: ResolveTwapPriceParams): Promise<ResolveTwapPriceResult> {
        // get the last aggregated token price
        const twapCacheResult = await this.aggregatedTokenPriceTwapCacheService.get(token.id)
        // get the current time
        const now = this.dayjsService.now()
        // get the maximum deviation ratio
        const maxDeviationRatio = envConfig().price.deviationMaxRatio
        // get the maximum age ms
        const maxAgeMs = envConfig().cache.stale.priceMaxAgeMs
        // resolve the price by market priority
        const resolvedPrice = this.priceSelectionService.resolveByMarketPriority({
            token,
            prices: twapCacheResult.lastAggregatedTokenPrice.prices,
            now,
            maxAgeMs,
            maxDeviationRatio,  
        })

        if (!resolvedPrice) {
            // if the resolved price is not found, throw an exception
            throw new AggregatedTokenPriceNotFoundException(
                {
                    id: token.id,
                }
            )
        }

        // get the snapshots
        const snapshots = (twapCacheResult.snapshots ?? [])
            .slice()
            .sort((a, b) => a.snapshotAt.valueOf() - b.snapshotAt.valueOf())
        // if the snapshots are empty, return the resolved price
        if (snapshots.length === 0) {
            return resolvedPrice
        }
        // get the window ms
        const windowMs = intervalMs ?? envConfig().inspector.twap.intervalMs
        // get the start at
        const startAt = snapshots[0].snapshotAt
        // get the raw from at
        const rawFromAt = now.subtract(
            windowMs,
            "milliseconds",
        )
        // get the from at
        const fromAt = rawFromAt.isBefore(startAt) ? startAt : rawFromAt
        // get the difference in milliseconds between the current time and the from at

        const dtMs = now.diff(
            fromAt,
            "milliseconds",
        )
        // if the difference in milliseconds is less than or equal to 0, return the resolved price
        if (dtMs <= 0) {
            return resolvedPrice
        }

        // piecewise-constant: integral of price over [fromAt, now], then TWAP = integral / dtMs
        let integral = new Decimal(0)
        // calculate the integral
        for (let i = 0; i < snapshots.length; i++) {
            // get the snapshot
            const a = snapshots[i]
            // get the start at
            const tStart = i === 0 ? fromAt : a.snapshotAt
            // get the end at
            const tEnd = i === snapshots.length - 1 ? now : snapshots[i + 1].snapshotAt
            // get the segment start
            const segStart = tStart.isAfter(fromAt) ? tStart : fromAt
            // get the segment end
            const segEnd = tEnd.isBefore(now) ? tEnd : now
            if (!segEnd.isAfter(segStart)) continue
            // get the segment milliseconds
            const segmentMs = segEnd.diff(
                segStart,
                "milliseconds",
            )
            // add the integral
            integral = integral.add(a.price.mul(segmentMs))
        }

        // get the TWAP
        const twap = integral.div(dtMs)
        console.log(`${token.name}: ${twap.toNumber()}`)
        // return the resolved price

        return {
            ...resolvedPrice,
            price: twap,
        }
    }

    /**
     * Creates the initial aggregated token price TWAP cache result.
     *
     * @param param - now, price, marketListingId
     * @returns The aggregated token price TWAP cache result.
     *
     * @example
     * const result = this.twapService.createInitialCacheResult({ now, price, marketListingId })
     */
    private createInitialCacheResult({
        now,
        price,
        marketListingId,
    }: CreateInitialCacheResultParams): AggregatedTokenPriceTwapCacheResult {
        const lastAggregatedTokenPrice: AggregatedTokenPriceCacheResult = {
            prices: {
                [marketListingId]: {
                    price,
                    snapshotAt: now,
                },
            },
            snapshotAt: now,
        }
        return {
            snapshotAt: now,
            snapshots: [],
            lastAggregatedTokenPrice,
        }
    }

    /**
     * Upserts the last price in the aggregated token price map.
     *
     * @param param - last, now, price, marketListingId
     * @returns The aggregated token price map.
     *
     * @example
     * const result = this.twapService.upsertLastPrice({ last, now, price, marketListingId })
     */
    private upsertLastPrice(
        last: AggregatedTokenPriceCacheResult,
        {
            now,
            price,
            marketListingId,
        }: UpsertLastPriceParams,
    ) {
        if (!last.prices) {
            last.prices = {
            }
        }
        last.prices[marketListingId] = {
            price,
            snapshotAt: now,
        }
        last.snapshotAt = now
    }
}
