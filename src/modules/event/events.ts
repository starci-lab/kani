import { FetchedPool } from "@modules/blockchains"
import { ChainId, Network } from "@typedefs"
import { BotSchema, CexId, ExecutorSchema, LiquidityPoolId, RpcEjection, TokenId } from "@modules/databases"
import crypto from "crypto"
import { DynamicClmmLiquidityPoolInfoCacheResult, DynamicDlmmLiquidityPoolInfoCacheResult } from "@modules/cache"

export enum EventName {
    CoordinatorExecutorCreated = "coordinatorExecutorCreated",
    ExecutorLoaded = "executorLoaded",
    ReinitializeBalancers = "reinitializeBalancers",
    CoordinatorExecutorDeleted = "coordinatorExecutorDeleted",
    CoordinatorExecutorUpdated = "coordinatorExecutorUpdated",
    UserCreated = "userCreated",
    UserDeleted = "userDeleted",
    BotCreated = "botCreated",
    BotDeleted = "botDeleted",
    ExecutorBotCreated = "executorBotCreated",
    ExecutorBotDeleted = "executorBotDeleted",
    ExecutorBotUpdated = "executorBotUpdated",
    CoinMarketCapPricesFetched = "coinMarketCapPricesFetched",
    CoinGeckoPricesFetched = "coinGeckoPricesFetched",
    PoolsUpdated = "poolsUpdated",
    ClmmLiquidityPoolsFetched = "clmmLiquidityPoolsFetched",
    DlmmLiquidityPoolsFetched = "dlmmLiquidityPoolsFetched",
    LiquidityPoolsUpdated = "liquidityPoolsUpdated",
    WsCexLastPricesUpdated = "wsCexLastPricesUpdated",
    WsCexOrderBookUpdated = "wsCexOrderBookUpdated",
    WsPythLastPricesUpdated = "wsPythLastPricesUpdated",
    DataSeeded = "dataSeeded",
    InitializerLoaded = "initializerLoaded",
    ClmmPositionOpenRequested = "openedClmmLiquidityPoolsFetched",
    ClmmPositionCloseRequested = "openedDlmmLiquidityPoolsFetched",
    DlmmPositionOpenRequested = "closedClmmLiquidityPoolsFetched",
    DlmmPositionCloseRequested = "closedDlmmLiquidityPoolsFetched",
    DistributedDlmmLiquidityPoolsFetched = "distributedDlmmLiquidityPoolsFetched",
    DistributedLiquidityPoolsFetched = "distributedLiquidityPoolsFetched",
    ActiveBotUpdated = "activeBotUpdated",
    UpdateActiveBot = "updateActiveBot",
    PositionClosed = "positionClosed",
    PositionOpened = "positionOpened",
    ExecutorExecutorUpdated = "executorExecutorUpdated",
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

export type DlmmLiquidityPoolsFetchedEvent = WithLiquidityPoolId<DynamicDlmmLiquidityPoolInfoCacheResult>

export type WithLiquidityPoolId<T> = T & {
    liquidityPoolId: LiquidityPoolId
}

export interface PythSuiPricesUpdatedEvent {
    network: Network
    tokenId: TokenId
    price: number
    chainId: ChainId
}

export type ClmmLiquidityPoolsFetchedEvent = WithLiquidityPoolId<DynamicClmmLiquidityPoolInfoCacheResult>

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

export interface CoordinatorExecutorCreatedEvent {
    id: string
}

export interface UserCreatedEvent {
    id: string
}

export interface UserDeletedEvent {
    id: string
}

export interface BotCreatedEvent {
    id: string
}

export interface BotDeletedEvent {
    id: string
}

export type ExecutorBotUpdatedEvent = BotSchema

export interface ReinitializeBalancersEvent {
    ejectedRpcs: Array<RpcEjection>
}

export interface CoordinatorExecutorDeletedEvent {
    id: string
}

export interface ExecutorLoadedEvent {
    id: string
}

export interface ExecutorCreatedEvent {
    id: string
}

export type CoordinatorExecutorUpdatedEvent = ExecutorSchema
export type ExecutorExecutorUpdatedEvent = ExecutorSchema