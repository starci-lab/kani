import { AbstractException } from "../abstract"

export class DexNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Dex not found", "DEX_NOT_FOUND_EXCEPTION")
    }
}

export class DexNotImplementedException extends AbstractException {
    constructor(message?: string) {
        super(message || "Dex not implemented", "DEX_NOT_IMPLEMENTED_EXCEPTION")
    }
}