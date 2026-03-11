import {
    Injectable,
} from "@nestjs/common"
import {
    BotSchema,
    BotViolateIndicatorSchema,
    BotViolateIndicatorType,
} from "@modules/databases"
import {
    CacheKey,
    CacheService,
    IndicatorStatus,
} from "@modules/cache"
import {
    DayjsService,
    AsyncService,
} from "@modules/mixin"
import {
    PctCalculatorService,
    RegressionCalculatorService,
    IndicatorResult,
} from "../../violate-calculators"
import {
    ClosePositionEnqueueService 
} from "@modules/blockchains"
import {
    PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    ActivePositionNotFoundException, 
    LiquidityPoolNotFoundException 
} from "@modules/exceptions"

/**
 * Handles bot violate indicators: loops over each indicator and delegates to the matching calculator.
 *
 * @example
 * await handleViolateIndicatorsService.process(bot)
 */
@Injectable()
export class HandleViolateIndicatorsService {
    constructor(
        private readonly pctCalculatorService: PctCalculatorService,
        private readonly regressionCalculatorService: RegressionCalculatorService,
        private readonly asyncService: AsyncService,
        private readonly cacheService: CacheService,
        private readonly dayjsService: DayjsService,
        private readonly closePositionEnqueueService: ClosePositionEnqueueService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Process all violate indicators for a bot.
     * Loops over each indicator and runs the corresponding calculator (pct, regression; volume spike skipped).
     *
     * @param bot - Bot with violateIndicators
     */
    async process(bot: BotSchema): Promise<void> {
        // do nothing if bot do not have active position
        if (!bot.activePosition) {
            return
        }
        //do nothing if there is no active position or the position is closed
        if (bot.activePosition && bot.activePosition.positionClosed) {
            return
        }
        const indicators = bot.violateIndicators ?? []
        if (indicators.length === 0) {
            return
        }
        const results = await this.asyncService.allIgnoreError(
            indicators.map(
                (indicator) => this.processIndicator(
                    bot,
                    indicator
                )
            ),
        )
        const filteredResults = results.filter((result) => result !== null)
        await this.cacheService.set({
            key: CacheKey.ViolateIndicatorResults,
            args: [bot.id],
            cacheResult: {
                snapshotAt: this.dayjsService.now(),
                results: filteredResults,
            },
        })
        const violateIndicatorsTriggered = filteredResults.some((result) => result?.status === IndicatorStatus.Trigger)
        if (violateIndicatorsTriggered) {
            // close position
            if (!bot.activePosition) {
                throw new ActivePositionNotFoundException({
                    botId: bot.id,
                })
            }
            const liquidityPool = this.primaryMemoryStorageService.liquidityPoolCollection.findOne({
                id: {
                    $eq: bot.activePosition.liquidityPool,
                },
            })
            if (!liquidityPool) {
                throw new LiquidityPoolNotFoundException({
                    id: bot.activePosition.liquidityPool.toString(),
                })
            }
            await this.closePositionEnqueueService.enqueue({
                bot,
                liquidityPool,
            })
        }
    }

    /**
     * Process a single violate indicator by type.
     */
    private async processIndicator(
        bot: BotSchema,
        indicator: BotViolateIndicatorSchema,
    ): Promise<IndicatorResult<unknown> | null> {
        switch (indicator.type) {
        case BotViolateIndicatorType.PricePct:
            return await this.pctCalculatorService.calculate(
                bot,
                indicator
            )
        case BotViolateIndicatorType.PriceRegression:
            return await this.regressionCalculatorService.calculate(
                bot,
                indicator
            )
        case BotViolateIndicatorType.VolumeSpike:
            // not implemented yet
            return null
        default:
            return null
        }
    }
}
