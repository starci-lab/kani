/**
 * Miscellaneous Exceptions
 * General purpose exceptions
 */

import { AbstractException } from "../abstract"

/** Thrown when maximum loop iterations are reached */
export class MaxLoopReachedException extends AbstractException {
    constructor(message?: string) {
        super(message || "Max loop reached", "MAX_LOOP_REACHED_EXCEPTION")
    }
}
