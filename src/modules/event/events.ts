import { FetchedPool } from "@modules/blockchains"
import { ChainId, Network } from "@modules/common"

export enum EventName {
    CoinMarketCapPricesFetched = "coinMarketCapPricesFetched",
    CoinGeckoPricesFetched = "coinGeckoPricesFetched",
    PoolsUpdated = "poolsUpdated",
    LiquidityPoolsFetched = "liquidityPoolsFetched",
    PricesUpdated = "pricesUpdated",
    DataSeeded = "dataSeeded",
}

export interface LiquidityPoolsFetchedEvent {
    chainId: ChainId
    network: Network
    pools: Array<FetchedPool>
}