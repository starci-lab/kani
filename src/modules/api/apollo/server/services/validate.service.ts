import {
    PaginationLimitOutOfRangeException,
    PaginationPageNumberOutOfRangeException,
} from "@modules/exceptions"
import {
    Injectable,
} from "@nestjs/common"
import {
    Decimal,
} from "decimal.js"
import type {
    ValidateLimitParams,
    ValidatePageNumberParams,
} from "../types"

/**
 * Service to validate pagination limit and page number.
 *
 * @example
 * validateService.validateLimit({ limit: 50, min: 1, max: 100 })
 */
@Injectable()
export class ValidateService {
    /**
     * Validates limit is within min/max; throws if out of range.
     *
     * @param param - limit, min and max
     */
    validateLimit(
        { limit, min, max }: ValidateLimitParams,
    ): void {
        if (!limit) {
            return
        }
        if (new Decimal(limit).lt(min) || new Decimal(limit).gt(max)) {
            throw new PaginationLimitOutOfRangeException(
                {
                    limit,
                    min,
                    max,
                },
            )
        }
    }

    /**
     * Validates page number is within 1..max; throws if out of range.
     *
     * @param param - pageNumber and max
     */
    validatePageNumber(
        { pageNumber, max }: ValidatePageNumberParams,
    ): void {
        if (new Decimal(pageNumber).lt(1) || new Decimal(pageNumber).gt(max)) {
            throw new PaginationPageNumberOutOfRangeException(
                {
                    pageNumber,
                    max,
                },
            )
        }
    }
}
