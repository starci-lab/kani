import {
    MarketListingId,
    RpcEjection,
} from "@modules/databases"
import Decimal from "decimal.js"

export type ReinitializeBalancersEventPayload = Array<RpcEjection>

export interface LockAuthorityTimeoutEventPayload {
    botId: string
}

export interface TokenPriceUpdatedEventPayload {
    id: string
    price: Decimal
    marketListingId: MarketListingId
}
