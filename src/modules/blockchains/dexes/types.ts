
import { BaseModuleOptions } from "@modules/common"
import { DexId } from "@modules/databases"
import { Transaction } from "@mysten/sui/transactions"

export interface DexesOptions extends BaseModuleOptions {
    dexes?: Array<DexId>
    useGcpKms?: boolean
}

export interface ActionResponse {
    // txb (sui only)
    txb?: Transaction
    extraObj?: unknown
}
