
import { DexId } from "@modules/databases"
import { CoinArgument } from "../types"

export interface DexesOptions {
    dexIds?: Array<DexId>
    enabled?: {
        observe?: boolean
        action?: boolean
        analytics?: boolean
        fees?: boolean
    }
}

export interface ActionResponse {
    // tx hash returned if the tx is excuted
    txHash?: string
    coinOut?: CoinArgument
}

export interface DexOptions {
    enabled?: boolean | {
        observe?: boolean
        action?: boolean
        analytics?: boolean
        fees?: boolean
    }
}