/**
 * DEX Exceptions
 * Errors related to decentralized exchange operations
 */

import { AbstractException } from "../abstract"

/** Thrown when DEX cannot be found */
export class DexNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Dex not found", "DEX_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when DEX operation is not yet implemented */
export class DexNotImplementedException extends AbstractException {
    constructor(message?: string) {
        super(message || "Dex not implemented", "DEX_NOT_IMPLEMENTED_EXCEPTION")
    }
}
