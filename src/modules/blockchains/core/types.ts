import { BaseModuleOptions } from "@modules/common"
import { DexId } from "@modules/databases"

export interface LiquidityPoolsOptions extends BaseModuleOptions {
    dexes?: Array<DexId>
    useGcpKms?: boolean
}