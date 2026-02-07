import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"
import type {
    DexId 
} from "@modules/databases"

/** Metadata when DEX operation is not yet implemented. */
export interface DexNotImplementedExceptionMetadata extends AbstractExceptionMetadata {
    id?: string
    displayId?: DexId
}

/** Thrown when DEX operation is not implemented. */
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