/**
 * Aggregator Exceptions
 * Errors related to DEX aggregator operations
 */

import { AbstractException } from "../abstract"

/** Thrown when an aggregator cannot be found */
export class AggregatorNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Aggregator not found", "AGGREGATOR_NOT_FOUND_EXCEPTION")
    }
}
