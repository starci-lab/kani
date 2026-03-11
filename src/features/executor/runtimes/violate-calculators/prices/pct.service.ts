import {
    Injectable 
} from "@nestjs/common"
import {
    RelativePriceBuilderService 
} from "./relative-price-builder.service"
import {
    BotSchema, BotViolateIndicatorSchema, 
    CexId, 
    PricePctViolateIndicatorMetadata
} from "@modules/databases"
import {
    InfluxdbPriceCacheService 
} from "../../influxdb-cache"
import {
    TokenNotFoundException 
} from "@modules/exceptions"
import {
    PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    CacheService 
} from "@modules/cache"

/**
 * Service for calculating percentage change between two prices.
 */
@Injectable()
export class PctCalculatorService {
    constructor(
        private readonly relativePriceBuilderService: RelativePriceBuilderService,
        private readonly influxdbPriceCacheService: InfluxdbPriceCacheService,
        private readonly cacheService: CacheService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
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
        const { 
            timeWindowMs, 
            triggerThresholds, 
            emergencyExitThresholds, 
            reentryThresholds 
        } = violateIndicator
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
        console.log(
            timeWindowMs, 
            triggerThresholds, 
            emergencyExitThresholds, 
            reentryThresholds 
        )
    }
}