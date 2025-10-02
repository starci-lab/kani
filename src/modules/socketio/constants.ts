import { ChainId, Network } from "@modules/common"
import { TokenId } from "@modules/databases"

export enum SocketIoEvent {
    PythPricesUpdated = "pyth_prices_updated",
}

export interface PythPricesUpdatedEvent {
    network: Network
    tokenId: TokenId
    price: number
    chainId: ChainId
}