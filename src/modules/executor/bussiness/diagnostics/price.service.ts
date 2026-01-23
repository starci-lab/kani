import {
    Injectable, 
    OnModuleInit 
} from "@nestjs/common"
import {
    PriceService 
} from "@modules/blockchains"
import {
    PrimaryMemoryStorageService, 
    TokenId,
    TokenSchema
} from "@modules/databases"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import {
    AsyncService, 
    LokiJSService,
    RetryService
} from "@modules/mixin"
import {
    AggregatedTokenPriceNotFoundException,
    PriceDiagnosticsFailedException
} from "@exceptions"
/**
 * PriceDiagnosticService
 *
 * Hard startup gate for oracle price availability.
 *
 * This service validates that all required price feeds are
 * reachable and able to return price data before the application
 * is allowed to operate.
 *
 * Behavior:
 *  - Runs during startup or explicit readiness checks
 *  - Resolves price for every configured token
 *  - Logs stale prices as warnings (does NOT block startup)
 *  - Treats missing or failing price resolutions as fatal
 *
 * Failure semantics:
 *  - If any token fails to resolve a price, the service throws
 *    and prevents the application from continuing.
 *
 * This guarantees that the system never runs in a state where
 * critical oracle inputs are unavailable.
 */
@Injectable()
export class PriceDiagnosticService implements OnModuleInit {
    private tokenCollection: Collection<TokenSchema>
    constructor(
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly priceService: PriceService,
    private readonly winstonService: WinstonService,
    private readonly asyncService: AsyncService,
    private readonly retryService: RetryService,
    private readonly lokiJSService: LokiJSService,
    ) {}

    async onModuleInit() {
        this.tokenCollection = await this.lokiJSService.createCollection<TokenSchema>(
            "price-diagnostic-tokens",
            {
                indices: ["displayId",
                    "id"],
            }
        )
        const tokens = this.primaryMemoryStorageService
            .tokenCollection.chain()
            .find(
                {
                    selectable: {
                        $eq: true,
                    },
                }
            ).data({
                removeMeta: true,
            })
        this.tokenCollection.insert(tokens)
    }

    async diagnose(): Promise<void> {
        await this.retryService.retry(
            {
                options: {
                    retries: Infinity,
                },
                action: async () => {
                // retrieve all tokens from the primary memory storage service
                    const tokens = this.tokenCollection.find()
                    // diagnose each token
                    const promises: Array<Promise<PriceFeedReadinessChecker>> = tokens.map(
                        async (token) => {
                            try {
                                const { isStale, ageMs } = await this.priceService.resolvePrice(
                                    {
                                        token,
                                    }
                                )
                                // we just warning if the price is stale
                                if (isStale) {
                                    this.winstonService.log(
                                        WinstonLog.PriceDiagnosticFailedStale,
                                        {
                                            tokenId: token.displayId,
                                            ageMs,
                                        }
                                    )
                                    return {
                                        tokenId: token.displayId,
                                        // stale prices are logged as warnings but do not block readiness
                                        success: false,
                                    }
                                } 
                                return {
                                    tokenId: token.displayId,
                                    success: true,
                                }
                            } catch (error) {
                                if (error instanceof AggregatedTokenPriceNotFoundException) {
                                    this.winstonService.log(
                                        WinstonLog.PriceDiagnosticFailedNotFound,
                                        {
                                            tokenId: token.displayId,
                                        }
                                    )
                                    return {
                                        tokenId: token.displayId,
                                        success: false,
                                    }
                                }
                                // we just logging if the price is not found
                                this.winstonService.log(
                                    WinstonLog.PriceDiagnosticFailed,
                                    {
                                        tokenId: token.displayId,
                                        error: error.message,
                                    }
                                )
                                // throw the error to the caller
                                return {
                                    tokenId: token.displayId,
                                    success: false,
                                }
                            }
                        }
                    )
                    const results = await this.asyncService.allMustDone(promises)
                    // if any of the promises returned false, throw an error
                    if (results.some((result) => !result.success)) {
                        throw new PriceDiagnosticsFailedException(
                            {
                                tokenIds: results.filter((result) => !result.success).map((result) => result.tokenId),
                            }
                        )
                    }
                },
            }
        )
    }
}

export interface PriceFeedReadinessChecker {
    tokenId: TokenId
    success: boolean
}