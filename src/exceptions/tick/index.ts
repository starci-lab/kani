/**
 * Tick Array Exceptions
 * Errors related to tick array operations
 */
import { AbstractException } from "../abstract"

export class TickArrayNotFoundException extends AbstractException {
    constructor(tickIndex: number, message?: string) {
        super(message || `Tick array not found for tick index ${tickIndex}`, "TICK_ARRAY_NOT_FOUND_EXCEPTION", { tickIndex })
    }
}