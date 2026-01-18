import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"
import {
    ErrorSuiObjectName 
} from "./types"
import {
    DexId, LiquidityPoolId 
} from "@modules/databases"

/** Thrown when Sui object is not found */
export interface SuiObjectNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    name: ErrorSuiObjectName
    parentId?: string
    id?: string
    dexId: DexId
    liquidityPoolId: LiquidityPoolId
}
export class SuiObjectNotFoundException extends AbstractException {
    constructor(
        { name, parentId, id, originalError }: SuiObjectNotFoundExceptionMetadata
    ) {
        super(
            "Sui object not found", 
            "SUI_OBJECT_NOT_FOUND_EXCEPTION", 
            {
                name, parentId, id, originalError
            }
        )
    }
}