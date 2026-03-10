import {
    Injectable 
} from "@nestjs/common"
import {
    RelativePriceBuilderService 
} from "./relative-price-builder.service"
import {
    BotSchema, BotViolateIndicatorSchema 
} from "@modules/databases"

/**
 * Service for calculating regression between two prices.
 */
@Injectable()
export class RegressionCalculatorService {
    constructor(
        private readonly relativePriceBuilderService: RelativePriceBuilderService,
    ) {}

    /**
     * Calculate regression for a bot violate indicator.
     * @param bot - The bot schema.
     * @param violateIndicator - The bot violate indicator schema.
     */
    async calculate(
        bot: BotSchema,
        violateIndicator: BotViolateIndicatorSchema
    ): Promise<void> {
        // console.log(bot,
        //     violateIndicator)
    }
}