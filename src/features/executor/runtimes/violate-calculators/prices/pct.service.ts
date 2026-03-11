import {
    Injectable
} from "@nestjs/common"
import {
    RelativePriceBuilderService
} from "./relative-price-builder.service"
import {
    BotSchema,
    BotViolateIndicatorSchema,
    CexId,
    IndicatorName,
    PricePoint,
} from "@modules/databases"
import {
    InfluxdbPriceCacheService
} from "../influxdb-cache"
import {
    BothTokensCannotBeUsdtException,
    TokenNotFoundException,
} from "@modules/exceptions"
import {
    PrimaryMemoryStorageService
} from "@modules/databases"
import {
    CacheService
} from "@modules/cache"
import {
    CacheKey
} from "@modules/cache"
import {
    Decimal
} from "decimal.js"
import {
    AsyncService
} from "@modules/mixin"
import fs from "fs"
import {
    OpService,
} from "../op.service"
import {
    IndicatorStatus,
    PricePctIndicatorResult,
} from "../types"

/**
 * Service responsible for calculating percentage change
 * for a bot indicator within a given time window.
 *
 * The calculation is based on the relative price movement
 * between targetToken and quoteToken.
 */
@Injectable()
export class PctCalculatorService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly relativePriceBuilderService: RelativePriceBuilderService,
        private readonly influxdbPriceCacheService: InfluxdbPriceCacheService,
        private readonly cacheService: CacheService,
        private readonly asyncService: AsyncService,
        private readonly opService: OpService,
    ) { }

    /**
     * Calculate percentage change for a bot violate indicator.
     *
     * Workflow:
     * 1. Load token metadata
     * 2. Determine how to compute relative prices
     * 3. Fetch historical price points
     * 4. Normalize prices to relative pair form
     * 5. Later steps will calculate percentage changes against thresholds
     */
    async calculate(
        bot: BotSchema,
        violateIndicator: BotViolateIndicatorSchema
    ): Promise<PricePctIndicatorResult | null> {
        /**
         * Extract configuration used to evaluate the indicator.
         * - timeWindowMs: how far back we look for price data
         * - thresholds: conditions used later to determine triggers
         */
        const {
            timeWindowMs,
            triggerThresholds,
            reentryThresholds,
        } = violateIndicator

        /**
         * Load the target token from in-memory storage.
         * This token represents the asset the bot is monitoring.
         */
        const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: bot.targetToken,
            },
        })

        /**
         * If the token metadata is missing, the bot configuration is invalid.
         */
        if (!targetToken) {
            throw new TokenNotFoundException({
                id: bot.targetToken.toString(),
            })
        }

        /**
         * Load the quote token (the asset used to measure price against).
         */
        const quoteToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: bot.quoteToken,
            },
        })

        /**
         * Quote token must exist for pair calculation.
         */
        if (!quoteToken) {
            throw new TokenNotFoundException(
                {
                    id: bot.quoteToken.toString(),
                }
            )
        }
        /**
         * Container for the normalized price points
         * representing the relative price movement of the pair.
         */
        let relativePricePoints: Array<PricePoint> = []

        /**
         * CASE 1:
         * Target token is USDT.
         *
         * This means we need the price of the quote token
         * in USDT to derive the relative price.
         */
        if (targetToken.isUsdt) {

            /**
             * A pair where both tokens are USDT is invalid
             * because the price ratio would always be 1.
             */
            if (quoteToken.isUsdt) {
                throw new BothTokensCannotBeUsdtException({
                    targetTokenId: targetToken.displayId,
                    quoteTokenId: quoteToken.displayId,
                })
            }

            /**
             * If the quote token has tracked CEX sources,
             * the pricing logic may be handled elsewhere.
             * Skip calculation for now.
             */
            if (quoteToken.trackedCexIds?.length) {
                return null
            }

            /**
             * Determine which CEX should be used as the active
             * price source for this token.
             */
            let activeCex = quoteToken.trackedCexIds[0]

            /**
             * Check cache for the currently active CEX.
             * This allows dynamic switching between exchanges.
             */
            const activeCexRecord = await this.cacheService.get({
                key: CacheKey.ActivePriceCex,
                args: [quoteToken.id],
            })

            if (activeCexRecord) {
                activeCex = activeCexRecord.cexId
            }

            /**
             * Fetch historical price points for the quote token
             * from the time-series cache (InfluxDB).
             */
            relativePricePoints = await this.influxdbPriceCacheService.getPoints({
                tokenId: quoteToken.id,
                cexId: activeCex,
                timeIntervalMs: timeWindowMs,
            })

            /**
             * CASE 2:
             * Quote token is USDT.
             *
             * This means we fetch the price of the target token
             * directly in USDT.
             */
        } else if (quoteToken.isUsdt) {
            /**
             * Skip calculation if token has tracked CEX logic handled elsewhere.
             */
            if (targetToken.trackedCexIds?.length) {
                return null
            }

            /**
             * Determine the default active CEX for the target token.
             */
            let activeCex = targetToken.trackedCexIds[0]

            /**
             * Check cache for dynamically selected exchange.
             */
            const activeCexRecord = await this.cacheService.get({
                key: CacheKey.ActivePriceCex,
                args: [targetToken.id],
            })

            if (activeCexRecord) {
                activeCex = activeCexRecord.cexId
            }

            /**
             * Retrieve historical price points of the target token.
             */
            relativePricePoints = await this.influxdbPriceCacheService.getPoints({
                tokenId: targetToken.id,
                cexId: activeCex,
                timeIntervalMs: timeWindowMs,
            })
            /**
             * Convert price to the relative pair representation.
             *
             * Since the pair direction is inverted (USDT/TOKEN),
             * we invert the price using:
             *
             * relativePrice = 1 / price
             */
            relativePricePoints = relativePricePoints.map((point) => (
                {
                    ...point,
                    price: new Decimal(1).div(new Decimal(point.price)).toNumber(),
                }
            ))
        } else {
            if (!targetToken.trackedCexIds?.length || !quoteToken.trackedCexIds?.length) {
                return null
            }
            // neither token is USDT, so we need to use the relative price builder
            const [
                activeCexA,
                activeCexB,
            ] = await this.asyncService.allMustDone([
                (async () => {
                    let activeCex = targetToken.trackedCexIds[0]
                    const activeCexRecord = await this.cacheService.get({
                        key: CacheKey.ActivePriceCex,
                        args: [targetToken.id],
                    })
                    if (activeCexRecord) {
                        activeCex = activeCexRecord.cexId
                    }
                    return activeCex
                })(),
                (async () => {
                    let activeCex = quoteToken.trackedCexIds[0]
                    const activeCexRecord = await this.cacheService.get({
                        key: CacheKey.ActivePriceCex,
                        args: [quoteToken.id],
                    })
                    if (activeCexRecord) {
                        activeCex = activeCexRecord.cexId
                    }
                    return activeCex
                })(),
            ])
            relativePricePoints = await this.relativePriceBuilderService.buildRelativePrice(
                {
                    tokenAId: targetToken.id,
                    tokenBId: quoteToken.id,
                    cexAId: activeCexA,
                    cexBId: activeCexB,
                    timeIntervalMs: timeWindowMs,
                }
            )
        }
        const firstPoint = relativePricePoints.at(0)
        const lastPoint = relativePricePoints.at(-1)
        if (!firstPoint || !lastPoint) {
            return null
        }
        const pctValue = new Decimal(lastPoint.price).div(new Decimal(firstPoint.price)).sub(1).abs().toNumber()
        const values: Partial<Record<IndicatorName, number>> = {
            [IndicatorName.Pct]: pctValue,
        }
        const metadata = { pct: pctValue }
        if (this.opService.evaluateGroup(values, triggerThresholds)) {
            return {
                status: IndicatorStatus.Trigger,
                timeWindowMs,
                metadata,
            }
        }
        if (this.opService.evaluateGroup(values, reentryThresholds)) {
            return {
                status: IndicatorStatus.Reentry,
                timeWindowMs,
                metadata,
            }
        }
        return {
            status: IndicatorStatus.NoAction,
            timeWindowMs,
            metadata,
        }
    }
}