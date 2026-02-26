import {
    Injectable 
} from "@nestjs/common"
import {
    envConfig 
} from "@modules/env"
import {
    AsyncService, DayjsService 
} from "@modules/mixin"
import {
    AggregatedTokenPriceNotFoundException,
    PriceByMarketPriorityNotResolvedException,
    TokenNotFoundException,
} from "@modules/exceptions"
import {
    AggregatedTokenPriceCacheResult,
    AggregatedTokenPriceCummulativeCacheResult,
    AggregatedTokenPriceCummulativeCacheService,
    CreateInitialCacheResultParams,
    SetAggregatedTokenPriceCummulativeParams,
    TwapSnapshot,
    UpsertLastPriceParams,
} from "@modules/cache"
import {
    ResolveCummulativePriceParams,
    ResolveCummulativePriceResult,
} from "./types"
import {
    PriceSelectionService 
} from "./price-selection.service"
import {
    PrimaryMemoryStorageService 
} from "@modules/databases"
import Decimal from "decimal.js"

/**
 * Service responsible for resolving prices (spot + relative).
 * TWAP window snapshots are persisted in cache service.
 */
@Injectable()
export class CummulativeService {
    constructor(
    private readonly dayjsService: DayjsService,
    private readonly aggregatedTokenPriceCummulativeCacheService: AggregatedTokenPriceCummulativeCacheService,
    private readonly asyncService: AsyncService,
    private readonly priceSelectionService: PriceSelectionService,
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Updates TWAP snapshots and last aggregated price map.
     *
     * Strategy:
     * - Always upsert latest price into lastAggregatedTokenPrice.prices.
     * - Every intervalMs, append one snapshot (current prices map) into snapshots.
     * - Prune snapshots to last maxSnapshots (from env).
     *
     * @param param - Id, price, marketListingId, intervalMs
     * @returns Promise that resolves when cache is updated
     *
     * @example
     * await this.cummulativeService.updateCummulativeSnapshot({ id, price, marketListingId, intervalMs })
     */
    async updateCummulativeSnapshot({
        id,
        price,
        marketListingId,
        intervalMs,
    }: SetAggregatedTokenPriceCummulativeParams): Promise<void> {
        const now = this.dayjsService.now()
    
        const [cacheResult] = await this.asyncService.resolveTuple(
            this.aggregatedTokenPriceCummulativeCacheService.get(id),
        )
    
        // init
        if (!cacheResult) {
            const initialCacheResult = this.createInitialCacheResult({
                now,
                price,
                marketListingId,
            })
            await this.aggregatedTokenPriceCummulativeCacheService.set({
                id,
                cacheResult: initialCacheResult,
            })
            return
        }
    
        // always upsert latest tick
        const lastAggregatedTokenPrice = cacheResult.lastAggregatedTokenPrice
        this.upsertLastPrice(
            lastAggregatedTokenPrice,
            {
                now,
                price,
                marketListingId,
            }
        )
        // the only correct "previous time" for cumulative integration:
        // last snapshot time (time of last appended cumulative snapshot)
        const lastSnapshot = cacheResult.snapshots.at(-1)!
        const lastSnapshotAt = lastSnapshot.snapshotAt
        const dtMs = now.diff(lastSnapshotAt,
            "milliseconds")
    
        // not time yet => just persist tick updates (no new snapshot)
        if (dtMs < intervalMs) {
            await this.aggregatedTokenPriceCummulativeCacheService.set({
                id,
                cacheResult,
            })
            return
        }
    
        // resolve token
        const token = this.primaryMemoryStorageService.tokenCollection.findOne({
            id 
        })
        // throw error if the token is not found
        if (!token) {
            throw new TokenNotFoundException({
                id 
            })
        }
        // resolve spot price at snapshot time (market priority)
        const resolvedPrice = this.priceSelectionService.resolveByMarketPriority({
            token,
            prices: lastAggregatedTokenPrice.prices,
            now,
            maxAgeMs: intervalMs,
            maxDeviationRatio: envConfig().price.deviationMaxRatio,
        })
        if (!resolvedPrice) {
            throw new PriceByMarketPriorityNotResolvedException({
                id: token.id 
            })
        }
        // integrate area under price curve: C(now) = C(prev) + price(now)*Δt
        // (piecewise-constant assumption between snapshots)
        const prevCumulative = lastSnapshot.cummulativePrice
        const safeDtMs = Math.max(0,
            dtMs)
    
        const newSnapshot: TwapSnapshot = {
            cummulativePrice: prevCumulative.add(resolvedPrice.price.mul(safeDtMs)),
            snapshotAt: now,
        }
    
        const maxSnapshots = envConfig().inspector.twap.maxSnapshots
        cacheResult.snapshots = [...cacheResult.snapshots,
            newSnapshot].slice(-maxSnapshots)
    
        // optional: if you want a separate "lastSnapshotAt" marker
        cacheResult.snapshotAt = now
    
        await this.aggregatedTokenPriceCummulativeCacheService.set(
            {
                id,
                cacheResult,
            }
        )
    }
    
    /**
     * Resolves the cummulative price for a token.
     *
     * @param param - token, intervalMs
     * @returns The cummulative price.
     *
     * @example
     * const result = this.cummulativeService.resolveCummulativePrice({ token, intervalMs })
     */
    async resolveCummulativePrice({
        token,
        intervalMs,
    }: ResolveCummulativePriceParams): Promise<ResolveCummulativePriceResult> {
        const aggregated = await this.aggregatedTokenPriceCummulativeCacheService.get(token.id)
        const now = this.dayjsService.now()
      
        const maxDeviationRatio = envConfig().price.deviationMaxRatio
        const maxAgeMs = envConfig().cache.stale.priceMaxAgeMs
      
        // 1) resolve spot price (market priority) for: extrapolate to now + stale/age
        const resolved = this.priceSelectionService.resolveByMarketPriority({
            token,
            prices: aggregated.lastAggregatedTokenPrice.prices,
            now,
            maxAgeMs,
            maxDeviationRatio,
        })
      
        if (!resolved) {
            throw new AggregatedTokenPriceNotFoundException({
                id: token.id 
            })
        }
      
        const snapshots = (aggregated.snapshots ?? [])
            .slice()
            .sort((a, b) => a.snapshotAt.valueOf() - b.snapshotAt.valueOf())
      
        if (snapshots.length === 0) {
            return resolved
        }
      
        // 2) define TWAP window: [fromAt, now]
        const windowMs = intervalMs ?? envConfig().inspector.twap.intervalMs
        const startAt = snapshots[0].snapshotAt
        const rawFromAt = now.subtract(windowMs,
            "milliseconds")
        const fromAt = rawFromAt.isBefore(startAt) ? startAt : rawFromAt
      
        // 3) helper: cumulative at any time t (linear interpolation between snapshots)
        const cumulativeAt = (t: typeof now): Decimal => {
            // before first snapshot -> clamp
            if (t.isSameOrBefore(snapshots[0].snapshotAt)) {
                return snapshots[0].cummulativePrice
            }
      
            const last = snapshots[snapshots.length - 1]
      
            // after last snapshot -> extrapolate using current resolved spot price
            if (t.isSameOrAfter(last.snapshotAt)) {
                const dt = new Decimal(t.diff(last.snapshotAt,
                    "milliseconds"))
                return last.cummulativePrice.add(resolved.price.mul(dt))
            }
      
            // inside -> find segment [a,b] where a.time <= t < b.time
            let i = 0
            while (i < snapshots.length - 1 && snapshots[i + 1].snapshotAt.isSameOrBefore(t)) {
                i++
            }
            const a = snapshots[i]
            const b = snapshots[i + 1]
      
            const totalDt = b.snapshotAt.diff(a.snapshotAt,
                "milliseconds")
            if (totalDt <= 0) return a.cummulativePrice
      
            const partDt = t.diff(a.snapshotAt,
                "milliseconds")
            const slope = b.cummulativePrice.sub(a.cummulativePrice).div(totalDt)
      
            return a.cummulativePrice.add(slope.mul(partDt))
        }
      
        // 4) compute TWAP = (C(now)-C(from)) / (now-from)
        const cTo = cumulativeAt(now)
        const cFrom = cumulativeAt(fromAt)
      
        const dtMs = now.diff(fromAt,
            "milliseconds")
        if (dtMs <= 0) return resolved
      
        const twap = cTo.sub(cFrom).div(dtMs)
      
        return {
            ...resolved,      // keep ageMs/isStale from spot selection
            price: twap,      // replace price with TWAP(window)
        }
    }

    /**
     * Creates the initial aggregated token price cummulative cache result.
     *
     * @param param - now, price, marketListingId
     * @returns Initial aggregated token price cummulative cache result
     *
     * @example
     * const result = this.cummulativeService.createInitialCacheResult({ now, price, marketListingId })
     */
    private createInitialCacheResult({
        now,
        price,
        marketListingId,
    }: CreateInitialCacheResultParams): AggregatedTokenPriceCummulativeCacheResult {
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
            snapshots: [
                {
                    // seed first cumulative snapshot = 0
                    cummulativePrice: new Decimal(0),
                    // snapshot at the start time
                    snapshotAt: now,
                }
            ],
            lastAggregatedTokenPrice,
        }
    }

    /**
     * Upserts the last price into the aggregated token price cache result.
     *
     * @param param - last, now, price, marketListingId
     * @returns void
     *
     * @example
     * this.cummulativeService.upsertLastPrice(last, { now, price, marketListingId })
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
    }
}