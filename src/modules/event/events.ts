import { FetchedPool } from "@modules/blockchains"
import { ChainId, Network } from "@modules/common"
import { CexId, LiquidityPoolId, TokenId } from "@modules/databases"
import BN from "bn.js"
import crypto from "crypto"

export enum EventName {
    CoinMarketCapPricesFetched = "coinMarketCapPricesFetched",
    CoinGeckoPricesFetched = "coinGeckoPricesFetched",
    PoolsUpdated = "poolsUpdated",
    LiquidityPoolsFetched = "liquidityPoolsFetched",
    DlmmLiquidityPoolsFetched = "dlmmLiquidityPoolsFetched",
    LiquidityPoolsUpdated = "liquidityPoolsUpdated",
    WsCexLastPricesUpdated = "wsCexLastPricesUpdated",
    WsCexOrderBookUpdated = "wsCexOrderBookUpdated",
    WsPythLastPricesUpdated = "wsPythLastPricesUpdated",
    DataSeeded = "dataSeeded",
    InitializerLoaded = "initializerLoaded",
    PythSuiPricesUpdated = "pythSuiPricesUpdated",
    InternalLiquidityPoolsFetched = "internalLiquidityPoolsFetched",
    InternalDlmmLiquidityPoolsFetched = "internalDlmmLiquidityPoolsFetched",
    DistributedDlmmLiquidityPoolsFetched = "distributedDlmmLiquidityPoolsFetched",
    DistributedLiquidityPoolsFetched = "distributedLiquidityPoolsFetched",
}

export const createEventName = (
    event: EventName, 
    params: Record<string, string>
) => {
    return crypto.createHash("sha256").update(JSON.stringify({ event, params })).digest("hex")
}

export interface LiquidityPoolsFetchedEvent {
    chainId: ChainId
    network: Network
    pools: string // serialized
}

export interface DlmmLiquidityPoolsFetchedEvent {
    liquidityPoolId: LiquidityPoolId
    tickCurrent: number
    liquidity: BN
    sqrtPriceX64: BN
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