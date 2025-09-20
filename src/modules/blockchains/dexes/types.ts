
import { BaseModuleOptions } from "@modules/common"
import { DexId } from "@modules/databases"
import { CoinArgument } from "../types"

export interface DexesOptions extends BaseModuleOptions {
    dexes?: Array<DexId>
    useGcpKms?: boolean
}

export interface ActionResponse {
    // tx hash returned if the tx is excuted
    txHash?: string
    coinOut?: CoinArgument
}
