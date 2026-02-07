/**
 * DEX exceptions.
 * Errors related to decentralized exchange operations.
 */

import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"
import type {
    DexId 
} from "@modules/databases"

/** Metadata when DEX cannot be found. */
export interface DexNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    id?: string
    displayId?: DexId
}

/** Thrown when DEX cannot be found. */
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
