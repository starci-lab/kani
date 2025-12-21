import { AbstractException } from "../abstract"

export class NoMorePositionsFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "No more positions found", "NO_MORE_POSITIONS_FOUND_EXCEPTION")
    }
}

export class MissingHistoryFiltersException extends AbstractException {
    constructor(message?: string) {
        super(message || "Missing history filters", "MISSING_HISTORY_FILTERS_EXCEPTION")
    }
}

export class NotDivisibleByIntervalHistoryFiltersException extends AbstractException {
    constructor(message?: string) {
        super(message || "Not divisible by interval in history filters", "NOT_DIVISIBLE_BY_INTERVAL_HISTORY_FILTERS_EXCEPTION")
    }
}

export class TooManyIntervalsException extends AbstractException {
    constructor(message?: string) {
        super(message || "Too many intervals in history filters", "TOO_MANY_INTERVALS_EXCEPTION")
    }
}