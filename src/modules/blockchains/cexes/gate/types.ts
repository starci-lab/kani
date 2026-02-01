import {
    TokenId 
} from "@modules/databases"

export interface GateTokenPrice {
    tokenId: TokenId
    id: string
    price: number
}

export interface GateTokenPriceData {
    symbol: string
    price: number
}




