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
 * Service for calculating percentage change between two prices.
 */
@Injectable()
export class PctCalculatorService {
    constructor(
        private readonly relativePriceBuilderService: RelativePriceBuilderService,
    ) {}

    /**
     * Calculate percentage change for a bot violate indicator.
     * @param bot - The bot schema.
     * @param violateIndicator - The bot violate indicator schema.
     */
    async calculate(
        bot: BotSchema,
        violateIndicator: BotViolateIndicatorSchema
    ): Promise<void> {
        console.log(bot,
            violateIndicator)
    }
}