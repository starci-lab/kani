/**
 * Root result from Meteora API for pool analytics (paginated).
 */
export interface PoolAnalyticsResult {
    /** Total number of pools. */
    total: number
    /** Total pages. */
    pages: number
    /** Current page (1-based). */
    current_page: number
    /** Page size. */
    page_size: number
    /** Array of pool items. */
    data: Array<PoolItem>
}

/**
 * Token info in Meteora pool.
 */
export interface PoolTokenInfo {
    /** Token mint address. */
    address: string
    /** Token name. */
    name: string
    /** Token symbol. */
    symbol: string
    /** Token decimals. */
    decimals: number
    /** Whether the token is verified. */
    is_verified: boolean
    /** Number of holders. */
    holders: number
    /** Whether freeze authority is disabled. */
    freeze_authority_disabled: boolean
    /** Total supply. */
    total_supply: number
    /** Token price. */
    price: number
    /** Market cap. */
    market_cap: number
}

/**
 * Pool config (bin step and fee percentages).
 */
export interface PoolConfig {
    /** Bin step. */
    bin_step: number
    /** Base fee percentage. */
    base_fee_pct: number
    /** Max fee percentage. */
    max_fee_pct: number
    /** Protocol fee percentage. */
    protocol_fee_pct: number
}

/**
 * Time-series metrics keyed by period (30m, 1h, 2h, 4h, 12h, 24h).
 */
export interface TimeSeriesMetrics {
    /** 30-minute. */
    "30m": number
    /** 1-hour. */
    "1h": number
    /** 2-hour. */
    "2h": number
    /** 4-hour. */
    "4h": number
    /** 12-hour. */
    "12h": number
    /** 24-hour. */
    "24h": number
}

/**
 * Cumulative metrics for the pool.
 */
export interface CumulativeMetrics {
    /** Cumulative volume. */
    volume: number
    /** Cumulative trade fee. */
    trade_fee: number
    /** Cumulative protocol fee. */
    protocol_fee: number
}

/**
 * Single pool item from Meteora analytics API.
 */
export interface PoolItem {
    /** Pool address. */
    address: string
    /** Pool name (e.g. "MET-SOL"). */
    name: string
    /** Token X details. */
    token_x: PoolTokenInfo
    /** Token Y details. */
    token_y: PoolTokenInfo
    /** Reserve X account address. */
    reserve_x: string
    /** Reserve Y account address. */
    reserve_y: string
    /** Token X amount in pool. */
    token_x_amount: number
    /** Token Y amount in pool. */
    token_y_amount: number
    /** Pool creation timestamp (ms). */
    created_at: number
    /** Reward mint X address. */
    reward_mint_x: string
    /** Reward mint Y address. */
    reward_mint_y: string
    /** Pool configuration. */
    pool_config: PoolConfig
    /** Dynamic fee percentage. */
    dynamic_fee_pct: number
    /** Total value locked. */
    tvl: number
    /** Current price. */
    current_price: number
    /** Annual percentage rate. */
    apr: number
    /** Annual percentage yield. */
    apy: number
    /** Whether the pool has a farm. */
    has_farm: boolean
    /** Farm APR. */
    farm_apr: number
    /** Farm APY. */
    farm_apy: number
    /** Volume by period. */
    volume: TimeSeriesMetrics
    /** Fees by period. */
    fees: TimeSeriesMetrics
    /** Protocol fees by period. */
    protocol_fees: TimeSeriesMetrics
    /** Fee TVL ratio by period. */
    fee_tvl_ratio: TimeSeriesMetrics
    /** Cumulative metrics. */
    cumulative_metrics: CumulativeMetrics
    /** Whether the pool is blacklisted. */
    is_blacklisted: boolean
    /** Launchpad identifier. */
    launchpad: string
    /** Tags. */
    tags: Array<string>
}
