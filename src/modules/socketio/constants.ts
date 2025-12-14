import { TokenId } from "@modules/databases"

export enum SocketIoEvent {
    PythPricesUpdated = "pyth_prices_updated",
    LiquidityPoolsFetched = "liquidity_pools_fetched",
}

export interface PythPricesUpdatedEvent {
    prices: Array<PythPriceUpdated>
}

export interface PythPriceUpdated {
    tokenId: TokenId
    price: number
}