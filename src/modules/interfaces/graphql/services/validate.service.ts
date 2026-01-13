import { 
    PaginationLimitOutOfRangeException, 
    PaginationPageNumberOutOfRangeException 
} from "@exceptions"
import { Injectable } from "@nestjs/common"
import { Decimal } from "decimal.js"

/**
 * Service to validate the limit of the pagination
 */
@Injectable()
export class ValidateService {
    /**
     * Validate the limit of the pagination
     */
    validateLimit(
        { limit, min, max }: ValidateLimitParams
    ): void {
        if (!limit) {
            return
        }
        if (new Decimal(limit).lt(min) || new Decimal(limit).gt(max)) {
            throw new PaginationLimitOutOfRangeException(
                `Limit must be between ${min} and ${max}`,
            )
        }
    }
    
    /**
     * Validate the page number of the pagination
     */
    validatePageNumber(
        { pageNumber, max }: ValidatePageNumberParams
    ): void {
        if (new Decimal(pageNumber).lt(1) || new Decimal(pageNumber).gt(max)) {
            throw new PaginationPageNumberOutOfRangeException(
                `Page number must be between 1 and ${max}`,
            )
        }
    }
}

export interface ValidateLimitParams {
    limit?: number
    min: number
    max: number
}

export interface ValidatePageNumberParams {
    pageNumber: number
    max: number
}