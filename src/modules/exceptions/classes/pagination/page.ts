import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

/** Metadata when pagination limit is out of range. */
export interface PaginationLimitOutOfRangeExceptionMetadata extends AbstractExceptionMetadata {
    limit: number
    min: number
    max: number
}

/** Thrown when pagination limit is out of range. */
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

/** Metadata when pagination page number is out of range. */
export interface PaginationPageNumberOutOfRangeExceptionMetadata extends AbstractExceptionMetadata {
    pageNumber: number
    max: number
}

/** Thrown when pagination page number is out of range. */
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