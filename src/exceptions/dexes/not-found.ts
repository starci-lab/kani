/**
 * DEX Exceptions
 * Errors related to decentralized exchange operations
 */

import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"

/** Thrown when DEX cannot be found */
export interface DexNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    id?: string
    displayId?: string
}
export class DexNotFoundException extends AbstractException {
    constructor(
        { id, displayId, originalError }: DexNotFoundExceptionMetadata
    ) {
        super("Dex not found",
            "DEX_NOT_FOUND_EXCEPTION",
            {
                id,
                displayId,
                originalError,
            })
    }
}
