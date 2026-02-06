/**
 * Root result from Momentum API for liquidity pools.
 */
export interface LiquidityPoolsApiResult {
    /** HTTP status code. */
    status: number
    /** Response message. */
    message: string
    /** Array of liquidity pools. */
    data: Array<LiquidityPool>
}

/**
 * Liquidity pool information in Momentum.
 */
export interface LiquidityPool {
    /** Pool ID. */
    poolId: string
    /** Token X type. */
    tokenXType: string
    /** Token Y type. */
    tokenYType: string
    /** Tick spacing. */
    tickSpacing: number
    /** LP fees percentage. */
    lpFeesPercent: string
    /** Protocol fees percentage. */
    protocolFeesPercent: string
    /** Whether the pool is stable. */
    isStable: boolean
    /** Minimum tick range factor. */
    minTickRangeFactor: number
    /** Whether the pool is deprecated. */
    isDeprecated: boolean
    /** Current square root price. */
    currentSqrtPrice: string
    /** Current tick index. */
    currentTickIndex: string
    /** Liquidity amount. */
    liquidity: string
    /** Liquidity HM (human readable). */
    liquidityHM: string
    /** Token X reserve. */
    tokenXReserve: string
    /** Token Y reserve. */
    tokenYReserve: string
    /** Total value locked. */
    tvl: string
    /** 24-hour volume. */
    volume24h: string
    /** 24-hour fees. */
    fees24h: string
    /** Annual percentage yield. */
    apy: string
    /** Timestamp. */
    timestamp: string
    /** Array of rewarders. */
    rewarders: Array<Rewarder>
    /** Token X information. */
    tokenX: TokenInfo
    /** Token Y information. */
    tokenY: TokenInfo
    /** APR breakdown. */
    aprBreakdown: AprBreakdown
}

/**
 * Token information in Momentum.
 */
export interface TokenInfo {
    /** Coin type. */
    coinType: string
    /** Token name. */
    name: string
    /** Token ticker. */
    ticker: string
    /** Icon URL. */
    iconUrl: string
    /** Token decimals. */
    decimals: number
    /** Token description. */
    description: string
    /** Whether the token is verified. */
    isVerified: boolean
    /** Whether the token is MMT whitelisted. */
    isMmtWhitelisted: boolean
    /** Token type. */
    tokenType: string
    /** Token price. */
    price: string
}

/**
 * APR breakdown information.
 */
export interface AprBreakdown {
    /** Total APR. */
    total: string
    /** Fee APR. */
    fee: string
    /** Array of reward APR. */
    rewards: Array<RewardApr>
}

/**
 * Reward APR information.
 */
export interface RewardApr {
    /** Rewarder address. */
    rewarder: string
    /** APR value. */
    apr: string
}

/**
 * Rewarder information.
 */
export interface Rewarder {
    /** Rewarder address. */
    rewarder: string
    /** APR value. */
    apr: string
}
