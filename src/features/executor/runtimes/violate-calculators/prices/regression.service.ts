import {
    Injectable
} from "@nestjs/common"
import {
    RelativePriceBuilderService
} from "./relative-price-builder.service"
import {
    BotSchema, 
    BotViolateIndicatorSchema, 
    PriceRegressionViolateIndicatorMetadata,
    PrimaryMemoryStorageService
} from "@modules/databases"
import {
    TokenNotFoundException 
} from "@modules/exceptions"

/**
 * Service for calculating regression between two prices.
 */
@Injectable()
export class RegressionCalculatorService {
    constructor(
        private readonly relativePriceBuilderService: RelativePriceBuilderService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) { }

    /**
     * Calculate regression for a bot violate indicator.
     * @param bot - The bot schema.
     * @param violateIndicator - The bot violate indicator schema.
     */
    async calculate(
        bot: BotSchema,
        violateIndicator: BotViolateIndicatorSchema
    ): Promise<void> {
        const { 
            timeWindowMs, 
            r2Threshold 
        } = violateIndicator.metadata as PriceRegressionViolateIndicatorMetadata
        const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: bot.targetToken,
            },
        })
        if (!targetToken) {
            throw new TokenNotFoundException({
                id: bot.targetToken.toString(),
            })
        }
        const quoteToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: bot.quoteToken,
            },
        })
        if (!quoteToken) {
            throw new TokenNotFoundException({
                id: bot.quoteToken.toString(),
            }
            )
            // thus, we will process later based on type of the target token and quote token
        }
    }
}