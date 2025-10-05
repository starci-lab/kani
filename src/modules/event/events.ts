import { FetchedPool } from "@modules/blockchains"
import { ChainId, Network } from "@modules/common"
import { TokenId } from "@modules/databases"

export enum EventName {
    CoinMarketCapPricesFetched = "coinMarketCapPricesFetched",
    CoinGeckoPricesFetched = "coinGeckoPricesFetched",
    PoolsUpdated = "poolsUpdated",
    LiquidityPoolsFetched = "liquidityPoolsFetched",
    PricesUpdated = "pricesUpdated",
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

export interface LiquidityPoolsUpdatedEvent {
    pool: FetchedPool
}