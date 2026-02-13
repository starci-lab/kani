import type {
    SuiObjectKind 
} from "@modules/blockchains"
import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"
import type {
    DexId, 
    LiquidityPoolId 
} from "@modules/databases"

/** Metadata when Sui object is invalid type. */
export interface SuiObjectInvalidTypeExceptionMetadata extends AbstractExceptionMetadata {
    kind: SuiObjectKind
    id?: string
    dexId: DexId
    liquidityPoolId?: LiquidityPoolId
}

/** Thrown when Sui object type is invalid. */
export class SuiObjectInvalidTypeException extends AbstractException {
    constructor(
        { kind, id, dexId, liquidityPoolId, originalError }: SuiObjectInvalidTypeExceptionMetadata
    ) {
        super(
            "Sui object invalid type exception", 
            "SUI_OBJECT_INVALID_TYPE_EXCEPTION", 
            {
                kind, id, dexId, liquidityPoolId, originalError
            }
        )
    }
}