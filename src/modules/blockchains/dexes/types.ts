
import {
    DexId 
} from "@modules/databases"
import {
    CoinArgument 
} from "../types"

export interface DexesOptions {
    dexIds?: Array<DexId>
    enabled?: {
        observe?: boolean
        action?: boolean | {
            enqueue?: boolean
            action?: boolean
        }
        analytics?: boolean
        reservesWithFees?: boolean
    }
}

export interface DexOptions {
    enabled?: {
        observe?: boolean
        action?: boolean | {
            enqueue?: boolean
            action?: boolean
        }
        analytics?: boolean
        reservesWithFees?: boolean
    }
}

export interface ActionResult {
    // tx hash returned if the tx is excuted
    txHash?: string
    coinOut?: CoinArgument
}