import { TokenId } from "@modules/databases"

export interface GateTokenPrice {
    tokenId: TokenId
    price: number
}

export interface GateTokenPriceData {
    symbol: string
    price: number
}


