import BN from "bn.js"

export enum CacheKey {
    OpenPositionTransaction = "openPositionTransaction",
    ClosePositionTransaction = "closePositionTransaction",
    WsCexLastPrice = "wsCexLastPrice",
    WsCexOrderBook = "wsCexOrderBook",
    DynamicLiquidityPoolInfo = "dynamicLiquidityPoolInfo",
    DynamicDlmmLiquidityPoolInfo = "dynamicDlmmLiquidityPoolInfo",
    CoinMarketCapPrices = "coinMarketCapPrices",
    CoinGeckoPrices = "coinGeckoPrices",
    LiquidityPools = "liquidityPools",
    TokenPriceData = "tokenPriceData",
    BinanceWsOrderBook = "binanceWsOrderBook",
    OraclePrices = "oraclePrices",
    PythTokenPrice = "pythTokenPrice",
    User = "user",
    UserIds = "userIds",
    SessionId = "sessionId",
    PoolAnalytics = "poolAnalytics",
    SignInOtpCode = "signInOtpCode",
}

export interface PythTokenPriceCacheResult {
    price: number
}

export interface DynamicLiquidityPoolInfoCacheResult {
    tickCurrent: number
    liquidity: BN
    sqrtPriceX64: BN
    rewards: Array<unknown>
}

export interface DynamicDlmmLiquidityPoolInfoCacheResult {
    activeId: number
    rewards: Array<unknown>
}

export interface PoolAnalyticsCacheResult {
    fee24H: string
    volume24H: string
    tvl: string
    apr24H: string
}

export interface SignInOtpCacheResult {
    otp: string
}