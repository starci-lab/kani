import { AbstractException } from "../abstract"

export class PaginationLimitOutOfRangeException extends AbstractException {
    constructor(message: string) {
        super(message, "PAGINATION_LIMIT_OUT_OF_RANGE_EXCEPTION")
    }
}