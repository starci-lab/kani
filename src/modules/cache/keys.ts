import BN from "bn.js"

export enum CacheKey {
    WsCexLastPrice = "wsCexLastPrice",
    WsCexOrderBook = "wsCexOrderBook",
    DynamicLiquidityPoolInfo = "dynamicLiquidityPoolInfo",
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

