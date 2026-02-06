/**
 * Root result from Raydium API for pools.
 */
export interface PoolResult {
    /** Response ID. */
    id: string
    /** Whether the request was successful. */
    success: boolean
    /** Array of pools. */
    data: Array<RaydiumPool>
}

/**
 * Raydium pool information.
 */
export interface RaydiumPool {
    /** Pool type. */
    type: string
    /** Program ID. */
    programId: string
    /** Pool ID. */
    id: string
    /** Mint A token information. */
    mintA: TokenInfo
    /** Mint B token information. */
    mintB: TokenInfo
    /** Reward default pool infos. */
    rewardDefaultPoolInfos: string
    /** Reward default infos. */
    rewardDefaultInfos: Array<RewardInfo>
    /** Current price. */
    price: number
    /** Mint amount A. */
    mintAmountA: number
    /** Mint amount B. */
    mintAmountB: number
    /** Fee rate. */
    feeRate: number
    /** Open time. */
    openTime: string
    /** Total value locked. */
    tvl: number
    /** Day statistics. */
    day: PeriodStats
    /** Week statistics. */
    week: PeriodStats
    /** Month statistics. */
    month: PeriodStats
    /** Pool types. */
    pooltype: Array<string>
    /** Farm upcoming count. */
    farmUpcomingCount: number
    /** Farm ongoing count. */
    farmOngoingCount: number
    /** Farm finished count. */
    farmFinishedCount: number
    /** Pool configuration. */
    config: PoolConfig
    /** Burn percent. */
    burnPercent: number
    /** Whether launch migrate pool. */
    launchMigratePool: boolean
}

/**
 * Token information in Raydium.
 */
export interface TokenInfo {
    /** Chain ID. */
    chainId: number
    /** Token address. */
    address: string
    /** Program ID. */
    programId: string
    /** Logo URI. */
    logoURI: string
    /** Token symbol. */
    symbol: string
    /** Token name. */
    name: string
    /** Token decimals. */
    decimals: number
    /** Tags. */
    tags: Array<string>
    /** Extensions. */
    extensions: Record<string, string>
}

/**
 * Reward information.
 */
export interface RewardInfo {
    /** Mint token information. */
    mint: TokenInfo
    /** Per second reward. */
    perSecond: string
    /** Start time. */
    startTime: string
    /** End time. */
    endTime: string
}

/**
 * Period statistics.
 */
export interface PeriodStats {
    /** Volume. */
    volume: number
    /** Volume quote. */
    volumeQuote: number
    /** Volume fee. */
    volumeFee: number
    /** APR. */
    apr: number
    /** Fee APR. */
    feeApr: number
    /** Minimum price. */
    priceMin: number
    /** Maximum price. */
    priceMax: number
    /** Reward APR array. */
    rewardApr: Array<number>
}

/**
 * Pool configuration.
 */
export interface PoolConfig {
    /** Config ID. */
    id: string
    /** Config index. */
    index: number
    /** Protocol fee rate. */
    protocolFeeRate: number
    /** Tick spacing. */
    tickSpacing: number
}
