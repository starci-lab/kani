import {
    MarketListingId,
    LiquidityPoolSchema
} from "@modules/databases"

/**
 * Liquidity pool context.
 */
export interface LiquidityPoolContext {
    /** Whether the token A is the zero token. */
    zeroIsA: boolean
    /** The liquidity pool. */
    pool: LiquidityPoolSchema
}

export interface LiquidityPoolExecutionScope {
    /** The token A's ID. */
    token0Id: string
    /** The token B's ID. */
    token1Id: string
    /** The market listing A's ID. */
    marketListing0Id: MarketListingId
    /** The market listing B's ID. */
    marketListing1Id: MarketListingId
    /** The liquidity pool contexts. */
    poolContexts: Array<LiquidityPoolContext>
}