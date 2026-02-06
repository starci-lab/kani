import type {
    TokenId
} from "@modules/databases"

/** Single Pyth price update. */
export interface PythPriceUpdated {
    tokenId: TokenId
    price: number
}

/** Pyth prices updated event payload. */
export interface PythPricesUpdatedEvent {
    prices: Array<PythPriceUpdated>
}
