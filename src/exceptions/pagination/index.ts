import { AbstractException } from "../abstract"

/**
 * Thrown when the limit of the pagination is out of range
 */
export class PaginationLimitOutOfRangeException extends AbstractException {
    constructor(message: string) {
        super(message, "PAGINATION_LIMIT_OUT_OF_RANGE_EXCEPTION")
    }
}

/**
 * Thrown when the page number of the pagination is out of range
 */
export class PaginationPageNumberOutOfRangeException extends AbstractException {
    constructor(message: string) {
        super(message, "PAGINATION_PAGE_NUMBER_OUT_OF_RANGE_EXCEPTION")
    }
}