import { ChainId } from "@typedefs"
import BN from "bn.js"
import { Dayjs } from "dayjs"

export enum CacheKey {
    SealedAesKey = "sealedAesKey",
    SealedJwtSecretKey = "sealedJwtSecretKey",
    EjectRpcs = "ejectRpcs",
    History = "history",
    HistoryNeedRevalidated = "historyNeedRevalidated",
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
    OracleTokenPrice = "oracleTokenPrice",
    User = "user",
    UserIds = "userIds",
    SessionId = "sessionId",
    PoolAnalytics = "poolAnalytics",
    SignInOtpCode = "signInOtpCode",
    SendOtpCode = "sendOtpCode",
    SpotPrice = "spotPrice",
    FeesResponse = "feesResponse",
}

export interface NonExpiredCacheResult {
    snapshotAt: Dayjs
}

export interface SpotPriceCacheResult {
    price: number
}

export enum OracleType {
    Pyth = "pyth",
    Coingecko = "coingecko",
    CoinMarketCap = "coinmarketcap",
    Binance = "binance",
    Gate = "gate",
    Bybit = "bybit",
}

export interface OracleTokenPriceCache extends NonExpiredCacheResult {
    price: number
    snapshotAt: Dayjs
}

export interface OracleTokenPricesCacheResult extends NonExpiredCacheResult {
    prices: Partial<Record<OracleType, OracleTokenPriceCache>>
}

export interface DynamicLiquidityPoolInfoCacheResult {
    snapshotAt: Dayjs
    tickCurrent: number
    liquidity: BN
    sqrtPriceX64: BN
    rewards: Array<unknown>
    feeGrowthGlobalA: BN
    feeGrowthGlobalB: BN
}

export interface DynamicDlmmLiquidityPoolInfoCacheResult {
    snapshotAt: Dayjs
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

export interface SendOtpCacheResult {
    otp: string
}

export type EjectedRpcsCacheResult = Partial<Record<ChainId, Array<string>>>