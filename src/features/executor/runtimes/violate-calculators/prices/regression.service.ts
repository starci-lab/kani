import {
    Injectable,
} from "@nestjs/common"
import {
    RelativePriceBuilderService,
} from "./relative-price-builder.service"
import {
    BotSchema,
    BotViolateIndicatorSchema,
    CexId,
    IndicatorName,
    PricePoint,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    InfluxdbPriceCacheService,
} from "../../influxdb-cache"
import {
    BothTokensCannotBeUsdtException,
    TokenNotFoundException,
} from "@modules/exceptions"
import {
    CacheService,
} from "@modules/cache"
import {
    CacheKey,
} from "@modules/cache"
import {
    Decimal,
} from "decimal.js"
import {
    AsyncService,
} from "@modules/mixin"
import {
    OpService,
} from "../op.service"
import {
    IndicatorStatus,
    PriceRegressionIndicatorResult,
} from "../types"
import ss from "simple-statistics"

/**
 * Service for calculating linear regression (slope + R²) on relative price series
 * and evaluating trigger / emergency exit / reentry thresholds via OpService.
 */
@Injectable()
export class RegressionCalculatorService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly relativePriceBuilderService: RelativePriceBuilderService,
        private readonly influxdbPriceCacheService: InfluxdbPriceCacheService,
        private readonly cacheService: CacheService,
        private readonly asyncService: AsyncService,
        private readonly opService: OpService,
    ) { }

    /**
     * Calculate regression for a bot violate indicator.
     * Same flow as pct: load tokens, get relative price points (3 cases), then
     * run linear regression with simple-statistics and evaluate thresholds with OpService.
     */
    async calculate(
        bot: BotSchema,
        violateIndicator: BotViolateIndicatorSchema,
    ): Promise<PriceRegressionIndicatorResult | null> {
        const {
            timeWindowMs,
            triggerThresholds,
            emergencyExitThresholds,
            reentryThresholds,
        } = violateIndicator

        const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: { $eq: bot.targetToken },
        })
        if (!targetToken) {
            throw new TokenNotFoundException({ id: bot.targetToken.toString() })
        }

        const quoteToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: { $eq: bot.quoteToken },
        })
        if (!quoteToken) {
            throw new TokenNotFoundException({ id: bot.quoteToken.toString() })
        }

        let relativePricePoints: Array<PricePoint> = []

        if (targetToken.isUsdt) {
            if (quoteToken.isUsdt) {
                throw new BothTokensCannotBeUsdtException({
                    targetTokenId: targetToken.displayId,
                    quoteTokenId: quoteToken.displayId,
                })
            }
            if (!quoteToken.trackedCexIds?.length) {
                return null
            }
            let activeCex = quoteToken.trackedCexIds[0]
            const activeCexRecord = await this.cacheService.get({
                key: CacheKey.ActivePriceCex,
                args: [quoteToken.id],
            })
            if (activeCexRecord) {
                activeCex = activeCexRecord.cexId
            }
            relativePricePoints = await this.influxdbPriceCacheService.getPoints({
                tokenId: quoteToken.id,
                cexId: activeCex,
                timeIntervalMs: timeWindowMs,
            })
        } else if (quoteToken.isUsdt) {
            if (!targetToken.trackedCexIds?.length) {
                return null
            }
            let activeCex = targetToken.trackedCexIds[0]
            const activeCexRecord = await this.cacheService.get({
                key: CacheKey.ActivePriceCex,
                args: [targetToken.id],
            })
            if (activeCexRecord) {
                activeCex = activeCexRecord.cexId
            }
            relativePricePoints = await this.influxdbPriceCacheService.getPoints({
                tokenId: targetToken.id,
                cexId: activeCex,
                timeIntervalMs: timeWindowMs,
            })
            relativePricePoints = relativePricePoints.map((point) => ({
                ...point,
                price: new Decimal(1).div(new Decimal(point.price)).toNumber(),
            }))
        } else {
            if (!targetToken.trackedCexIds?.length || !quoteToken.trackedCexIds?.length) {
                return null
            }
            const [activeCexA, activeCexB] = await this.asyncService.allMustDone([
                (async () => {
                    let activeCex = targetToken.trackedCexIds![0]
                    const rec = await this.cacheService.get({
                        key: CacheKey.ActivePriceCex,
                        args: [targetToken.id],
                    })
                    if (rec) activeCex = rec.cexId
                    return activeCex
                })(),
                (async () => {
                    let activeCex = quoteToken.trackedCexIds![0]
                    const rec = await this.cacheService.get({
                        key: CacheKey.ActivePriceCex,
                        args: [quoteToken.id],
                    })
                    if (rec) activeCex = rec.cexId
                    return activeCex
                })(),
            ])
            relativePricePoints = await this.relativePriceBuilderService.buildRelativePrice({
                tokenAId: targetToken.id,
                tokenBId: quoteToken.id,
                cexAId: activeCexA,
                cexBId: activeCexB,
                timeIntervalMs: timeWindowMs,
            })
        }
        if (relativePricePoints.length < 2) {
            return null
        }
        const sorted = [...relativePricePoints].sort((a, b) => a.time - b.time)
        const firstPrice = relativePricePoints.at(0)?.price ?? 0
        const lastPrice = relativePricePoints.at(-1)?.price ?? 0
        const data = sorted.map(p => [
            p.time - (sorted.at(0)?.time ?? 0),
            p.price
          ] as [number, number])
        const lr = ss.linearRegression(data)
        const line = ss.linearRegressionLine(lr)
        const r2Raw = ss.rSquared(data, line)
        const r2Value = Number.isFinite(r2Raw) ? r2Raw : 1
        const pctValue = new Decimal(lastPrice).div(new Decimal(firstPrice)).sub(1).abs().toNumber()

        const values: Partial<Record<IndicatorName, number>> = {
            [IndicatorName.Pct]: pctValue,
            [IndicatorName.R2]: r2Value,
        }
        const metadata = { pct: pctValue, r2: r2Value }
        if (this.opService.evaluateAll(values, emergencyExitThresholds)) {
            return { 
                status: IndicatorStatus.EmergencyExit, 
                timeWindowMs, 
                metadata 
            }
        }
        if (this.opService.evaluateAll(values, triggerThresholds)) {
            return { 
                status: IndicatorStatus.Trigger, 
                timeWindowMs, 
                metadata 
            }
        }
        if (this.opService.evaluateAll(values, reentryThresholds)) {
            return { 
                status: IndicatorStatus.Reentry, 
                timeWindowMs, 
                metadata 
            }
        }
        return {
            status: IndicatorStatus.NoAction,
            timeWindowMs,
            metadata,
        }
    }
}
