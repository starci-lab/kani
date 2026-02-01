import {
    TokenId 
} from "@modules/databases"

export interface CoingeckoTokenPrice {
    tokenId: TokenId
    id: string
    price: number
}

export interface CoingeckoTokenPriceData {
    coinId: string
    price: number
}
