import { TokenId } from "@modules/databases"

export interface PythTokenPrice {
    tokenId: TokenId
    price: number
}

export interface PythTokenPriceData {
    feedId: string
    price: number
}