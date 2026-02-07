import {
    Injectable, 
    OnApplicationBootstrap, 
    OnModuleInit 
} from "@nestjs/common"
import {
    PriceService 
} from "@modules/blockchains"
import type {
    TokenSchema 
} from "@modules/databases"
import {
    PrimaryMemoryStorageService, 
} from "@modules/databases"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import {
    AsyncService, 
    LokiJSService,
} from "@modules/mixin"
import {
    AggregatedTokenPriceNotFoundException
} from "@modules/exceptions"
import {
    Interval 
} from "@nestjs/schedule"
import {
    envConfig 
} from "@modules/env"
import {
    Collection,
} from "lokijs"
import type {
    PriceDiagnosticReadinessResult,
} from "../types"
/**
 * PriceDiagnosticService
 *
 * Price feed diagnostics + readiness snapshot.
 *
 * This service periodically resolves prices for all selectable tokens
 * and stores the latest per-token diagnostic result in an in-memory
 * LokiJS collection (`this.results`).
 *
 * Behavior:
 *  - On bootstrap, triggers an immediate diagnostics run (warm cache)
 *  - On interval, refreshes results for every selectable token
 *  - Logs stale / not-found / error details
 *  - Exposes `isReady(tokenId)` based on the latest stored result
 *
 * Failure semantics:
 *  - Diagnostics failures are captured as `{ success: false }` results
 *    (no throw from `diagnose()`).
 *
 * Note:
 *  - If you need this to be a hard startup gate, enforce it in the
 *    caller by inspecting `results` and throwing when any token fails.
 */
@Injectable()
export class PriceDiagnosticService implements OnModuleInit, OnApplicationBootstrap {
    private tokenCollection: Collection<TokenSchema>
    // Stores the latest diagnostics result per tokenId for readiness checks.
    private results: Collection<PriceDiagnosticReadinessResult>
    constructor(
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly priceService: PriceService,
    private readonly winstonService: WinstonService,
    private readonly asyncService: AsyncService,
    private readonly lokiJSService: LokiJSService,
    ) {}

    onApplicationBootstrap() {
        // Run once immediately on startup so readiness checks have data
        // without waiting for the first interval tick.
        this.diagnoseInterval()
    }
    
    @Interval(envConfig().executor.diagnose.price.interval)
    async diagnoseInterval() {
        const results = await this.diagnose()
        // Overwrite the previous snapshot (atomic enough for our in-memory usage).
        this.results.clear()
        // Insert the latest results so `isReady()` can do a quick lookup by tokenId.
        this.results.insert(results)
    }

    async onModuleInit() {
        // Snapshot the tokens set we want to diagnose into a local Loki collection.
        // This keeps the diagnostic input stable and avoids coupling to the primary
        // memory collection's internal metadata.
        this.tokenCollection = await this.lokiJSService.createCollection<TokenSchema>({
            name: "price-diagnostic-tokens",
            options: {
                indices: ["displayId",
                    "id"],
            },
        })
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
        // Create the results collection used by `isReady()`.
        this.results = await this.lokiJSService.createCollection<PriceDiagnosticReadinessResult>({
            name: "price-diagnostic-results",
            options: {
                indices: ["id"],
            },
        })
    }

    /**
     * Diagnose price availability for all selectable tokens.
     *
     * @returns Array of diagnostic readiness results per token
     */
    async diagnose(): Promise<Array<PriceDiagnosticReadinessResult>> {
        // retrieve all tokens from the primary memory storage service
        const tokens = this.tokenCollection.find()
        // diagnose each token
        const promises: Array<Promise<PriceDiagnosticReadinessResult>> = tokens.map(
            async (token) => {
                try {
                    const { isStale, ageMs, price } = await this.priceService.resolvePrice(
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
                                price: price.toNumber(),
                            }
                        )
                        return {
                            id: token.id,
                            ready: false,
                            ageMs,
                            price: price.toNumber(),
                        }
                    } 
                    return {
                        id: token.id,
                        ready: true,
                        ageMs,
                        price: price.toNumber(),
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
                            id: token.id,
                            ready: false,
                        }
                    }
                    // Any other error: log and mark as failed.
                    this.winstonService.log(
                        WinstonLog.PriceDiagnosticFailed,
                        {
                            tokenId: token.displayId,
                            error: error.message,
                        }
                    )
                    return {
                        id: token.id,
                        ready: false,
                    }
                }
            }
        )
        return await this.asyncService.allMustDone<Array<PriceDiagnosticReadinessResult>>(promises)
    }

    /**
     * Check if a token's price is ready (non-stale, available).
     *
     * @param id - Token ID
     * @returns true if ready
     */
    async ready(id: string): Promise<boolean> {
        // Fast readiness check backed by the latest interval snapshot.
        const result = this.results.findOne({
            id: {
                $eq: id,
            },
        })
        return result?.ready ?? false
    }
}
