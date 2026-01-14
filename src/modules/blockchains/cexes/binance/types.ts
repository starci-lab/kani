import { TokenId } from "@modules/databases"

export interface BinanceTokenPrice {
    tokenId: TokenId
    price: number
}

export interface BinanceTokenPriceData {
    symbol: string
    price: number
}