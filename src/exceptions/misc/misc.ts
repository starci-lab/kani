import { AbstractException } from "../abstract"

export class MaxLoopReachedException extends AbstractException {
    constructor(message?: string) {
        super(message || "Max loop reached", "MAX_LOOP_REACHED_EXCEPTION")
    }
}