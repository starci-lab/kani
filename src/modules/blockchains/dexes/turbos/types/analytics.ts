/**
 * Turbos object ID information.
 */
export interface TurbosObjectId {
    /** Object ID. */
    id: string
}

/**
 * Reward info fields in Turbos.
 */
export interface TurbosRewardInfoFields {
    /** Object ID. */
    id: TurbosObjectId
    /** Vault address. */
    vault: string
    /** Manager address. */
    manager: string
    /** Growth global. */
    growth_global: string
    /** Vault coin type. */
    vault_coin_type: string
    /** Emissions per second. */
    emissions_per_second: string
}

/**
 * Turbos reward information.
 */
export interface TurbosRewardInfo {
    /** Object ID. */
    id: TurbosObjectId
    /** Vault address. */
    vault: string
    /** Manager address. */
    manager: string
    /** Growth global. */
    growth_global: string
    /** Vault coin type. */
    vault_coin_type: string
    /** Emissions per second. */
    emissions_per_second: string
    /** Optional deprecated fields. */
    fields?: TurbosRewardInfoFields
}

/**
 * Turbos pool information.
 */
export interface TurbosPool {
    /** Pool ID. */
    id: number
    /** Coin A amount. */
    coin_a: string
    /** Coin B amount. */
    coin_b: string
    /** Liquidity amount. */
    liquidity: string
    /** Max liquidity per tick. */
    max_liquidity_per_tick: string
    /** 24-hour average liquidity. */
    liquidity_24h_avg: string
    /** 7-day average liquidity. */
    liquidity_7d_avg: string
    /** 30-day average liquidity. */
    liquidity_30d_avg: string
    /** Fee rate. */
    fee: string
    /** Protocol fee rate. */
    fee_protocol: string
    /** Fee growth global A. */
    fee_growth_global_a: string
    /** Fee growth global B. */
    fee_growth_global_b: string
    /** Protocol fees A. */
    protocol_fees_a: string
    /** Protocol fees B. */
    protocol_fees_b: string
    /** Square root price. */
    sqrt_price: string
    /** Current tick index. */
    tick_current_index: number
    /** Tick spacing. */
    tick_spacing: string
    /** Pool ID. */
    pool_id: string
    /** Pool type. */
    type: string
    /** Fee type. */
    fee_type: string
    /** Whether the pool is unlocked. */
    unlocked: boolean
    /** Whether the pool is a vault. */
    is_vault: boolean
    /** Whether auto collect is enabled. */
    auto_collect: boolean
    /** Flag value. */
    flag: number
    /** Pool category. */
    category: "stable" | string | null
    /** Coin symbol A. */
    coin_symbol_a: string
    /** Coin symbol B. */
    coin_symbol_b: string
    /** Coin type A. */
    coin_type_a: string
    /** Coin type B. */
    coin_type_b: string
    /** Add 2 percent depth. */
    add_2_percent_depth: string
    /** Reduce 2 percent depth. */
    reduce_2_percent_depth: string
    /** Reward information array. */
    reward_infos: Array<TurbosRewardInfo>
    /** Reward last updated time in milliseconds. */
    reward_last_updated_time_ms: string
    /** APR value. */
    apr: number
    /** 7-day APR. */
    apr_7d: number
    /** APR percentage. */
    apr_percent: number
    /** Fee APR. */
    fee_apr: number
    /** Reward APR. */
    reward_apr: number
    /** 7-day fee APR. */
    fee_7d_apr: number
    /** 7-day reward APR. */
    reward_7d_apr: number
    /** 24-hour volume in USD. */
    volume_24h_usd: number
    /** 7-day volume in USD. */
    volume_7d_usd: number
    /** 30-day volume in USD. */
    volume_30d_usd: number
    /** Liquidity in USD. */
    liquidity_usd: number
    /** Coin A liquidity in USD. */
    coin_a_liquidity_usd: number
    /** Coin B liquidity in USD. */
    coin_b_liquidity_usd: number
    /** 24-hour fees in USD. */
    fee_24h_usd: number
    /** 7-day fees in USD. */
    fee_7d_usd: number
    /** Deploy time in milliseconds. */
    deploy_time_ms: string
    /** Array of ticks. */
    ticks: Array<unknown>
    /** Created at timestamp. */
    created_at: string
    /** Updated at timestamp. */
    updated_at: string
}
