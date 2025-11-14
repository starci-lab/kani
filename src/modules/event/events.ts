import { FetchedPool } from "@modules/blockchains"
import { ChainId, Network } from "@modules/common"
import { CexId, LiquidityPoolId, TokenId } from "@modules/databases"
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
    InternalLiquidityPoolsFetched = "internalLiquidityPoolsFetched",
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

export interface WsCexLastPricesUpdatedEvent {
    cexId: CexId
    tokenId: TokenId
    lastPrice: number
}

export interface WsCexOrderBookUpdatedEvent {
    cexId: CexId
    tokenId: TokenId
    orderBook: OrderBook
}

export interface OrderBook {
    bidPrice: number
    bidQty: number
    askPrice: number
    askQty: number
}

export interface WsPythLastPricesUpdatedEvent {
    tokenId: TokenId
    price: number
}