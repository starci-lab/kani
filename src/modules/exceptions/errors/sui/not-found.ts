import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"
import type {
    ErrorSuiObjectKind 
} from "../../enums"

/** Metadata when Sui object is not found. */
export interface SuiObjectNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    kind: ErrorSuiObjectKind
    parentId?: string
    id?: string
    dexId: string
    liquidityPoolId: string
}

/** Thrown when Sui object cannot be found. */
export class SuiObjectNotFoundException extends AbstractException {
    constructor(
        { kind, parentId, id, originalError }: SuiObjectNotFoundExceptionMetadata
    ) {
        super(
            "Sui object not found", 
            "SUI_OBJECT_NOT_FOUND_EXCEPTION", 
            {
                kind, parentId, id, originalError
            }
        )
    }
}