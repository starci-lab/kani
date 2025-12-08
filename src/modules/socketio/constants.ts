import { ChainId, Network } from "@typedefs"
import { TokenId } from "@modules/databases"

export enum SocketIoEvent {
    PythPricesUpdated = "pyth_prices_updated",
    LiquidityPoolsFetched = "liquidity_pools_fetched",
}

export interface PythPricesUpdatedEvent {
    network: Network
    tokenId: TokenId
    price: number
    chainId: ChainId
}