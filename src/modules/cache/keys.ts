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
    Fee24H = "fee24H",
    Volume24H = "volume24H",
    Liquidity = "liquidity",
    APR24H = "apr24H",
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
