import {
    TokenId 
} from "@modules/databases"

export interface CoinMarketCapTokenPrice {
    tokenId: TokenId
    id: string
    price: number
}

export interface CoinMarketCapTokenPriceData {
    symbol: string
    price: number
}
