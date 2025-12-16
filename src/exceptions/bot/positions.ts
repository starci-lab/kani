import { AbstractException } from "../abstract"

export class NoMorePositionsFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "No more positions found", "NO_MORE_POSITIONS_FOUND_EXCEPTION")
    }
}