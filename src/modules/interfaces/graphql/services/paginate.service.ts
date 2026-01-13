import { Injectable } from "@nestjs/common"
import Decimal from "decimal.js"

/**
 * Service to paginate the items
 */
@Injectable()
export class PaginateService {
    /**
     * Paginate the items
     */
    paginate<T>(
        items: Array<T>,
        pageNumber: number,
        limit: number,
    ): Array<T> {
        const start = new Decimal(pageNumber).sub(1).mul(limit).toNumber()
        return items.slice(start, start + limit)
    }
}

export interface PaginateParams<T> {
    items: Array<T>
    pageNumber: number
    limit: number
}