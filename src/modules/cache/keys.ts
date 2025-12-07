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
