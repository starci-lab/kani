import { AbstractException } from "../abstract"
import { ErrorSuiObjectName } from "./types"
import { DexId, LiquidityPoolId } from "@modules/databases"

/** Thrown when Sui object is invalid type */
export interface SuiObjectInvalidTypeExceptionMetadata {
    name: ErrorSuiObjectName
    id?: string
    dexId: DexId
    liquidityPoolId: LiquidityPoolId
}
export class SuiObjectInvalidTypeException extends AbstractException {
    constructor(
        { name, id }: SuiObjectInvalidTypeExceptionMetadata
    ) {
        super(
            "SUI_OBJECT_INVALID_TYPE_EXCEPTION", 
            "SUI_OBJECT_INVALID_TYPE_EXCEPTION", 
            { name, id }
        )
    }
}