import { TokenId } from "@modules/databases"

export enum PythServiceName {
    Pyth = "Pyth",
}

export interface PythOptions {
    utilitiesOnly?: boolean
}

export interface PythTokenPrice {
    tokenId: TokenId
    price: number
}

export interface PythTokenPriceData {
    feedId: string
    price: number
}