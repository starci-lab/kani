import {
    Injectable,
} from "@nestjs/common"
import Decimal from "decimal.js"
import type {
    PaginateParams,
    PaginateResult,
} from "../types"

/**
 * Service to paginate arrays by page number and limit.
 *
 * @example
 * const page = paginateService.paginate({ items: all, pageNumber: 1, limit: 10 })
 */
@Injectable()
export class PaginateService {
    /**
     * Returns a slice of items for the given page.
     *
     * @param param - items, pageNumber and limit
     * @returns Items for the requested page
     */
    paginate<T>({ items, pageNumber, limit }: PaginateParams<T>): PaginateResult<T> {
        const start = new Decimal(pageNumber).sub(1).mul(limit).toNumber()
        return items.slice(start,
            start + limit)
    }
}
