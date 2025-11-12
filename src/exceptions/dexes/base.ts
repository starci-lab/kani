import { DexId } from "@modules/databases"
import { AbstractException } from "../abstract"

export class DexNotFoundException extends AbstractException {
    constructor(dexId: DexId, message?: string) {
        super(message || "Dex not found", "DEX_NOT_FOUND_EXCEPTION", { dexId })
    }
}