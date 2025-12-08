
import { DexId } from "@modules/databases"
import { CoinArgument } from "../types"

export interface DexesOptions {
    dexes?: Array<DexOptions & { dexId: DexId }>
    withUtilities?: boolean
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
    }
}