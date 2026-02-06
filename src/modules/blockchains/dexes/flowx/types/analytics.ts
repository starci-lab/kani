/**
 * Root result from FlowX GraphQL API for pool detail query.
 */
export interface GetClmmPoolDetailRootResult {
    /** Pool detail data. */
    getClmmPoolsDetail: {
        /** Array of pool details. */
        items: Array<ClmmPoolDetail>
    }
}

/**
 * Detailed information about a FlowX CLMM pool.
 */
export interface ClmmPoolDetail {
    /** Pool ID. */
    id: string
    /** Fee rate. */
    feeRate: number
    /** Coin Y type. */
    coinYType: string
    /** Coin X type. */
    coinXType: string
    /** LP object ID. */
    lpObjectId: string
    /** Reserve X amount. */
    reserveX: string
    /** Reserve Y amount. */
    reserveY: string
    /** Pool statistics. */
    stats: ClmmPoolStats
    /** Coin X information. */
    coinXInfo: ClmmCoinInfo
    /** Coin Y information. */
    coinYInfo: ClmmCoinInfo
    /** GraphQL typename. */
    __typename: string
}

/**
 * Statistics for a FlowX CLMM pool.
 */
export interface ClmmPoolStats {
    /** 24-hour volume. */
    volume24H: string
    /** 7-day volume. */
    volume7D: string
    /** 24-hour fees. */
    fee24H: string
    /** 7-day fees. */
    fee7D: string
    /** Annual percentage rate. */
    apr: string
    /** Total liquidity in USD. */
    totalLiquidityInUSD: string
    /** Liquidity USD for coin X. */
    liquidityUSDX: string
    /** Liquidity USD for coin Y. */
    liquidityUSDY: string
    /** Average liquidity. */
    averageLiquidity: string
    /** GraphQL typename. */
    __typename: string
}

/**
 * Coin information in FlowX.
 */
export interface ClmmCoinInfo {
    /** Coin name. */
    name: string
    /** Coin symbol. */
    symbol: string
    /** Coin type. */
    type: string
    /** Coin decimals. */
    decimals: number
    /** Icon URL. */
    iconUrl: string
    /** Derived price in USD. */
    derivedPriceInUSD: string
    /** GraphQL typename. */
    __typename: string
}
