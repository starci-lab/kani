import {
    TokenId 
} from "@modules/databases"

export interface BybitTokenPrice {
    tokenId: TokenId
    id: string
    price: number
}

export interface BybitTokenPriceData {
    symbol: string
    price: number
}




