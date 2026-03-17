import type {
    DexId,
    LiquidityPoolSchema
} from "@modules/databases"
import type {
    SuiMoveObjectData,
    SuiObjectKind
} from "@modules/blockchains"
import BN from "bn.js"

/** Params for fetching a Sui object (must be Move object). Throws if not found or not move object. */
export interface FetchSuiObjectParams {
    /** Object ID to fetch */
    objectId: string
    /** Object kind for exception context */
    kind: SuiObjectKind
    /** DEX ID for exception context */
    dexId: DexId
    /** Liquidity pool for exception context */
    liquidityPool?: LiquidityPoolSchema
}
/** Result of fetching a Sui Move object (generic). Pass T to get typed fields. */
export interface FetchSuiMoveObjectResult<Fields> {
    /** Full object data (id, digest, owner, type, etc.) */
    object: SuiMoveObjectData<Fields>
    /** Move object fields (typed as Fields). */
    fields: Fields
}

/** Params for fetching a Sui transaction block. */
export interface FetchTransactionBlockParams {
    /** Transaction hash to fetch */
    txHash: string
}   

/** Result of fetching a Sui object. */
export interface FetchSuiObjectResponse<T> {
    /** Object data */
    data: T
    /** Storage rebate */
    storageRebate: BN
}