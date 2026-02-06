/**
 * Response from Cetus API for pool list query.
 */
export interface CetusPoolListResult {
    /** Response code. */
    code: number
    /** Response message. */
    msg: string
    /** Response data. */
    data: CetusPoolListData
}

/**
 * Data structure containing pool list information.
 */
export interface CetusPoolListData {
    /** Total number of pools. */
    total: number
    /** Array of pool information. */
    list: Array<CetusPoolInfo>
}

/**
 * Information about a Cetus pool.
 */
export interface CetusPoolInfo {
    /** Pool address. */
    pool: string
    /** Fee rate. */
    feeRate: number
    /** Whether to show reverse. */
    showReverse: boolean
    /** Coin A information. */
    coinA: CetusCoinInfo
    /** Coin B information. */
    coinB: CetusCoinInfo
    /** Total value locked. */
    tvl: string
    /** Total APR. */
    totalApr: string
    /** Array of pool statistics. */
    stats: Array<CetusPoolStat>
    /** Array of mining rewarders. */
    miningRewarders: Array<CetusMiningRewarder>
    /** Pool extensions. */
    extensions: CetusPoolExtensions
}

/**
 * Information about a coin in Cetus.
 */
export interface CetusCoinInfo {
    /** Coin type. */
    coinType: string
    /** Coin symbol. */
    symbol: string
    /** Coin decimals. */
    decimals: number
    /** Whether the coin is verified. */
    isVerified: boolean
    /** Logo URL. */
    logoURL: string
}

/**
 * Statistics for a Cetus pool.
 */
export interface CetusPoolStat {
    /** Date type for the statistics. */
    dateType: "24H" | "7D" | "30D"
    /** Volume. */
    vol: string
    /** Fee. */
    fee: string
    /** APR. */
    apr: string
}

/**
 * Mining rewarder information.
 */
export interface CetusMiningRewarder {
    /** Coin type. */
    coinType: string
    /** Coin symbol. */
    symbol: string
    /** Coin decimals. */
    decimals: number
    /** Logo URL. */
    logoURL: string
    /** Whether to display. */
    display: boolean
    /** APR. */
    apr: string
    /** Emissions per second. */
    emissionsPerSecond: string
}

/**
 * Pool extensions information.
 */
export interface CetusPoolExtensions {
    /** Frozen amount. */
    frozen: string
    /** Pool tag. */
    pool_tag: string
}
