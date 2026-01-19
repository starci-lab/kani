import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"

/**
 * Thrown when the limit of the pagination is out of range
 */
export interface PaginationLimitOutOfRangeExceptionMetadata extends AbstractExceptionMetadata {
    limit: number
    min: number
    max: number
}
export class PaginationLimitOutOfRangeException extends AbstractException {
    constructor(
        { limit, min, max, originalError }: PaginationLimitOutOfRangeExceptionMetadata
    ) {
        super(
            "Pagination limit out of range",
            "PAGINATION_LIMIT_OUT_OF_RANGE_EXCEPTION",
            {
                limit,
                min,
                max,
                originalError,
            }
        )
    }
}

/**
 * Thrown when the page number of the pagination is out of range
 */
export interface PaginationPageNumberOutOfRangeExceptionMetadata extends AbstractExceptionMetadata {
    pageNumber: number
    max: number
}
export class PaginationPageNumberOutOfRangeException extends AbstractException {
    constructor(
        { pageNumber, max, originalError }: PaginationPageNumberOutOfRangeExceptionMetadata
    ) {
        super(
            "Pagination page number out of range",
            "PAGINATION_PAGE_NUMBER_OUT_OF_RANGE_EXCEPTION",
            {
                pageNumber,
                max,
                originalError,
            }
        )
    }
}