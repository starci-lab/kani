import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"
import {
    DexId 
} from "@modules/databases"

/** Thrown when DEX operation is not yet implemented */
export interface DexNotImplementedExceptionMetadata extends AbstractExceptionMetadata {
    id?: string
    displayId?: DexId
}
export class DexNotImplementedException extends AbstractException {
    constructor(
        { id, displayId, originalError }: DexNotImplementedExceptionMetadata
    ) {
        super("Dex not implemented",
            "DEX_NOT_IMPLEMENTED_EXCEPTION",
            {
                id,
                displayId,
                originalError,
            })
    }
}