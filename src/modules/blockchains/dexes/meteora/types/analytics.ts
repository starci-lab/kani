/**
 * Root result from Meteora API for pool analytics.
 */
export interface PoolAnalyticsResult {
    /** Array of pool groups. */
    groups: Array<Group>
    /** Total number of pools. */
    total: number
}

/**
 * Group of liquidity pools in Meteora.
 */
export interface Group {
    /** Group name. */
    name: string
    /** Array of pairs in the group. */
    pairs: Array<Pair>
}

/**
 * Pair information in Meteora.
 */
export interface Pair {
    /** Pair address. */
    address: string
    /** Pair name. */
    name: string
    /** Mint address for token X. */
    mint_x: string
    /** Mint address for token Y. */
    mint_y: string
    /** Reserve X amount. */
    reserve_x: string
    /** Reserve Y amount. */
    reserve_y: string
    /** Reserve X amount (number). */
    reserve_x_amount: number
    /** Reserve Y amount (number). */
    reserve_y_amount: number
    /** Bin step. */
    bin_step: number
    /** Base fee percentage. */
    base_fee_percentage: string
    /** Max fee percentage. */
    max_fee_percentage: string
    /** Protocol fee percentage. */
    protocol_fee_percentage: string
    /** Liquidity amount. */
    liquidity: string
    /** Reward mint X. */
    reward_mint_x: string
    /** Reward mint Y. */
    reward_mint_y: string
    /** 24-hour fees. */
    fees_24h: number
    /** Today's fees. */
    today_fees: number
    /** 24-hour trade volume. */
    trade_volume_24h: number
    /** Cumulative trade volume. */
    cumulative_trade_volume: string
    /** Cumulative fee volume. */
    cumulative_fee_volume: string
    /** Current price. */
    current_price: number
    /** Annual percentage rate. */
    apr: number
    /** Annual percentage yield. */
    apy: number
    /** Farm APR. */
    farm_apr: number
    /** Farm APY. */
    farm_apy: number
    /** Whether the pair is hidden. */
    hide: boolean
    /** Whether the pair is blacklisted. */
    is_blacklisted: boolean
    /** Fee information. */
    fees: Fees
    /** Fee TVL ratio. */
    fee_tvl_ratio: FeeTvlRatio
    /** Volume information. */
    volume: Volume
    /** Whether the pair is verified. */
    is_verified: boolean
}

/**
 * Fee information for different time periods.
 */
export interface Fees {
    /** 30-minute fees. */
    min_30: number
    /** 1-hour fees. */
    hour_1: number
    /** 2-hour fees. */
    hour_2: number
    /** 4-hour fees. */
    hour_4: number
    /** 12-hour fees. */
    hour_12: number
    /** 24-hour fees. */
    hour_24: number
}

/**
 * Fee TVL ratio for different time periods.
 */
export interface FeeTvlRatio {
    /** 30-minute fee TVL ratio. */
    min_30: number
    /** 1-hour fee TVL ratio. */
    hour_1: number
    /** 2-hour fee TVL ratio. */
    hour_2: number
    /** 4-hour fee TVL ratio. */
    hour_4: number
    /** 12-hour fee TVL ratio. */
    hour_12: number
    /** 24-hour fee TVL ratio. */
    hour_24: number
}

/**
 * Volume information for different time periods.
 */
export interface Volume {
    /** 30-minute volume. */
    min_30: number
    /** 1-hour volume. */
    hour_1: number
    /** 2-hour volume. */
    hour_2: number
    /** 4-hour volume. */
    hour_4: number
    /** 12-hour volume. */
    hour_12: number
    /** 24-hour volume. */
    hour_24: number
}
