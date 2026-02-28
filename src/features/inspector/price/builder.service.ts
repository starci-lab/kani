import {
    PrimaryMemoryStorageService
} from "@modules/databases"
import {
    LiquidityPoolExecutionScope, LiquidityPoolContext
} from "./types"
import {
    Injectable, OnModuleInit
} from "@nestjs/common"
import {
    combinations
} from "@modules/common"
import {
    Collection
} from "lokijs"
import {
    LokiJSService
} from "@modules/mixin"
import {
    envConfig
} from "@modules/env"
import {
    Interval
} from "@nestjs/schedule"

/**
 * Service for building liquidity pool execution scopes.
 */
@Injectable()
export class LiquidityPoolExecutionScopeBuilderService implements OnModuleInit {
    /** The collection of liquidity pool execution scopes. */
    public executionScopesCollection: Collection<LiquidityPoolExecutionScope>

    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly lokiJSService: LokiJSService,
    ) { }
    /**
     * On module init.
     */
    async onModuleInit() {
        this.executionScopesCollection =
            await this.lokiJSService.createCollection<LiquidityPoolExecutionScope>({
                name: "liquidity-pool-execution-scopes",
            })
    }

    /**
     * Handle the build interval.
     */
    @Interval(envConfig().inspector.priceWindow.proccess.intervalMs)
    async handleBuildInterval() {
        await this.build()
    }

    /**
     * Build the liquidity pool execution scopes.
     */
    async build() {
        /** Get all tokens. */
        const tokens = this.primaryMemoryStorageService.tokenCollection.find()
        /** Get all token pairs. */
        const tokenPairs = combinations(tokens,
            2).map(([a,
            b]) => {
            const [token0,
                token1] = [a,
                b].sort((x, y) => x.id.localeCompare(y.id))
            return {
                token0, token1
            }
        })
        /** Initialize the execution scopes. */
        let scopes: Array<LiquidityPoolExecutionScope> = []
        /** Loop through all token pairs. */
        for (const { token0, token1 } of tokenPairs) {
            /** Get all liquidity pools for the token pair. */
            const pools = this.primaryMemoryStorageService.liquidityPoolCollection.find({
                tokenA: {
                    $in: [token0.id,
                        token1.id]
                },
                tokenB: {
                    $in: [token0.id,
                        token1.id]
                },
            })
            /** Get the pool contexts. */
            const poolContexts: Array<LiquidityPoolContext> = pools.map((pool) => ({
                zeroIsA: pool.tokenA.id === token0.id, // token0 maps to pool.tokenA
                pool,
            }))
            /** Get all signal market listings for the token pair. */
            const signalListings0 = token0.marketListings.filter((marketListing) => marketListing.isSignal)
            const signalListings1 = token1.marketListings.filter((marketListing) => marketListing.isSignal)
            /** Loop through all signal market listings for the token pair. */
            for (const market0 of signalListings0) {
                for (const market1 of signalListings1) {
                    /** Create a new execution scope. */
                    scopes.push(
                        {
                            token0Id: token0.id,
                            token1Id: token1.id,
                            marketListing0Id: market0.id,
                            marketListing1Id: market1.id,
                            poolContexts,
                        }
                    )
                }
            }
        }
        // filter out no pool contexts
        scopes = scopes.filter((scope) => scope.poolContexts.length > 0)
        /** Clear the existing execution scopes. */
        this.executionScopesCollection.clear()
        /** Insert the new execution scopes. */
        this.executionScopesCollection.insert(scopes)
    }
}   