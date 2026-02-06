/**
 * Root result from Orca API for whirlpool pools.
 */
export interface WhirlpoolPoolResult {
    /** Array of whirlpool pools. */
    data: Array<WhirlpoolPool>
}

/**
 * Whirlpool pool information in Orca.
 */
export interface WhirlpoolPool {
    /** Pool address. */
    address: string
    /** Whirlpools config address. */
    whirlpoolsConfig: string
    /** Whirlpool bump seeds. */
    whirlpoolBump: Array<number>
    /** Tick spacing. */
    tickSpacing: number
    /** Tick spacing seed. */
    tickSpacingSeed: Array<number>
    /** Fee rate. */
    feeRate: number
    /** Protocol fee rate. */
    protocolFeeRate: number
    /** Liquidity amount. */
    liquidity: string
    /** Square root price. */
    sqrtPrice: string
    /** Current tick index. */
    tickCurrentIndex: number
    /** Protocol fee owed for token A. */
    protocolFeeOwedA: string
    /** Protocol fee owed for token B. */
    protocolFeeOwedB: string
    /** Token mint A. */
    tokenMintA: string
    /** Token vault A. */
    tokenVaultA: string
    /** Fee growth global A. */
    feeGrowthGlobalA: string
    /** Token mint B. */
    tokenMintB: string
    /** Token vault B. */
    tokenVaultB: string
    /** Fee growth global B. */
    feeGrowthGlobalB: string
    /** Reward last updated timestamp. */
    rewardLastUpdatedTimestamp: string
    /** Updated at timestamp. */
    updatedAt: string
    /** Updated slot. */
    updatedSlot: number
    /** Write version. */
    writeVersion: number
    /** Whether the pool has warning. */
    hasWarning: boolean
    /** Pool type. */
    poolType: string
    /** Token A information. */
    tokenA: TokenA
    /** Token B information. */
    tokenB: TokenB
    /** Current price. */
    price: string
    /** TVL in USDC. */
    tvlUsdc: string
    /** Yield over TVL. */
    yieldOverTvl: string
    /** Token balance A. */
    tokenBalanceA: string
    /** Token balance B. */
    tokenBalanceB: string
    /** Statistics. */
    stats: Stats
    /** Array of rewards. */
    rewards: Array<Reward>
    /** Address lookup table. */
    addressLookupTable: string
    /** Fee tier index. */
    feeTierIndex: number
    /** Whether adaptive fee is enabled. */
    adaptiveFeeEnabled: boolean
    /** Trade enable timestamp. */
    tradeEnableTimestamp: string
}

/**
 * Token A information.
 */
export interface TokenA {
    /** Token address. */
    address: string
    /** Program ID. */
    programId: string
    /** Image URL. */
    imageUrl: string
    /** Token name. */
    name: string
    /** Token symbol. */
    symbol: string
    /** Token decimals. */
    decimals: number
}

/**
 * Token B information.
 */
export interface TokenB {
    /** Token address. */
    address: string
    /** Program ID. */
    programId: string
    /** Image URL. */
    imageUrl: string
    /** Token name. */
    name: string
    /** Token symbol. */
    symbol: string
    /** Token decimals. */
    decimals: number
}

/**
 * Statistics information.
 */
export interface Stats {
    /** 24-hour statistics. */
    "24h": Stats24h
    /** 7-day statistics. */
    "7d": Stats7d
    /** 30-day statistics. */
    "30d": Stats30d
}

/**
 * 24-hour statistics.
 */
export interface Stats24h {
    /** Volume. */
    volume: string
    /** Fees. */
    fees: string
    /** Optional rewards. */
    rewards?: string
    /** Yield over TVL. */
    yieldOverTvl: string
}

/**
 * 7-day statistics.
 */
export interface Stats7d {
    /** Volume. */
    volume: string
    /** Fees. */
    fees: string
    /** Optional rewards. */
    rewards?: string
    /** Yield over TVL. */
    yieldOverTvl: string
}

/**
 * 30-day statistics.
 */
export interface Stats30d {
    /** Volume. */
    volume: string
    /** Fees. */
    fees: string
    /** Optional rewards. */
    rewards?: string
    /** Yield over TVL. */
    yieldOverTvl: string
}

/**
 * Reward information.
 */
export interface Reward {
    /** Mint address. */
    mint: string
    /** Vault address. */
    vault: string
    /** Authority address. */
    authority: string
    /** Emissions per second X64. */
    emissions_per_second_x64: string
    /** Growth global X64. */
    growth_global_x64: string
    /** Whether the reward is active. */
    active: boolean
    /** Emissions per second. */
    emissionsPerSecond: string
}
