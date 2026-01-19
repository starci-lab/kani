import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"
import {
    DexId 
} from "@modules/databases"
import {
    LiquidityPoolId 
} from "@modules/databases"
/** Thrown when Sui object is invalid type */
export interface SuiObjectInvalidTypeExceptionMetadata extends AbstractExceptionMetadata {
    name: string
    id?: string
    dexId: DexId
    liquidityPoolId: LiquidityPoolId
}
export class SuiObjectInvalidTypeException extends AbstractException {
    constructor(
        { name, id, dexId, liquidityPoolId, originalError }: SuiObjectInvalidTypeExceptionMetadata
    ) {
        super(
            "Sui object invalid type exception", 
            "SUI_OBJECT_INVALID_TYPE_EXCEPTION", 
            {
                name, id, dexId, liquidityPoolId, originalError
            }
        )
    }
}