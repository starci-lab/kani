import type {
    DexId,
    LiquidityPoolId
} from "@modules/databases"
import type {
    SuiObjectKind
} from "@modules/blockchains"
import type {
    SuiParsedData,
    SuiObjectData
} from "@mysten/sui/client"

/** Params for fetching a Sui object (must be Move object). Throws if not found or not move object. */
export interface FetchSuiObjectParams {
    /** Object ID to fetch */
    objectId: string
    /** Object kind for exception context */
    kind: SuiObjectKind
    /** DEX ID for exception context */
    dexId: DexId
    /** Liquidity pool ID for exception context */
    liquidityPoolId: LiquidityPoolId
}

/** Move object content from Sui (dataType === "moveObject"). */
export type SuiMoveObjectContent = SuiParsedData & {
    dataType: "moveObject"
}

/** Sui object data with content narrowed to Move object. */
export interface SuiMoveObjectData extends SuiObjectData {
    content: SuiMoveObjectContent
}

/** Result of fetching a Sui Move object (generic). Pass T to get typed fields. */
export interface FetchSuiMoveObjectResult<T = Record<string, unknown>> {
    /** Full object data (id, digest, owner, type, etc.) */
    object: SuiMoveObjectData
    /** Move object fields (typed as T). */
    fields: T
}
