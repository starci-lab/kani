import { FetchedPool } from "@modules/blockchains"
import { ChainId, Network } from "@modules/common"
import { LiquidityPoolId, TokenId } from "@modules/databases"
import BN from "bn.js"

export enum EventName {
    CoinMarketCapPricesFetched = "coinMarketCapPricesFetched",
    CoinGeckoPricesFetched = "coinGeckoPricesFetched",
    PoolsUpdated = "poolsUpdated",
    LiquidityPoolsFetched = "liquidityPoolsFetched",
    LiquidityPoolsUpdated = "liquidityPoolsUpdated",
    WsCexLastPricesUpdated = "wsCexLastPricesUpdated",
    WsCexOrderBookUpdated = "wsCexOrderBookUpdated",
    WsPythLastPricesUpdated = "wsPythLastPricesUpdated",
    DataSeeded = "dataSeeded",
    InitializerLoaded = "initializerLoaded",
    PythSuiPricesUpdated = "pythSuiPricesUpdated",
}

export interface LiquidityPoolsFetchedEvent {
    chainId: ChainId
    network: Network
    pools: string // serialized
}

export interface PythSuiPricesUpdatedEvent {
    network: Network
    tokenId: TokenId
    price: number
    chainId: ChainId
}

export interface LiquidityPoolsFetchedEvent {
    liquidityPoolId: LiquidityPoolId
    tickCurrent: number
    liquidity: BN
    sqrtPriceX64: BN
}

export interface LiquidityPoolsUpdatedEvent {
    pool: FetchedPool
}