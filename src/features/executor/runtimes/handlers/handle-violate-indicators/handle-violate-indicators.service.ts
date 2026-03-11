import {
    Injectable,
} from "@nestjs/common"
import {
    BotSchema,
    BotViolateIndicatorSchema,
    BotViolateIndicatorType,
} from "@modules/databases"
import {
    AsyncService,
} from "@modules/mixin"
import {
    PctCalculatorService,
    RegressionCalculatorService,
    IndicatorResult
} from "../../violate-calculators"

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
        await this.asyncService.allIgnoreError(
            indicators.map(
                (indicator) => this.processIndicator(
                    bot,
                    indicator
                )
            ),
        )
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
            return await this.pctCalculatorService.calculate(bot,
                indicator)
        case BotViolateIndicatorType.PriceRegression:
            return await this.regressionCalculatorService.calculate(bot,
                indicator)
        case BotViolateIndicatorType.VolumeSpike:
            // not implemented yet
            return null
        default:
            return null
        }
    }
}
