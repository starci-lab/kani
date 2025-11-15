import { AbstractException } from "@exceptions"

export class AggregatorNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Aggregator not found", "AGGREGATOR_NOT_FOUND_EXCEPTION")
    }
}