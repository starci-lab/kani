import { TokenId } from "@modules/databases"

export interface BybitTokenPrice {
    tokenId: TokenId
    price: number
}

export interface BybitTokenPriceData {
    symbol: string
    price: number
}


