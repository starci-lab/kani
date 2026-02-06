/** Params for paginate: items array and page number/limit. */
export interface PaginateParams<T> {
    items: Array<T>
    pageNumber: number
    limit: number
}

/** Result of paginate: slice of items for the requested page. */
export type PaginateResult<T> = Array<T>

/** Plain interface for cursor pagination response with data array. */
export interface IPaginationCursorResponseData<T = unknown> {
    cursor?: string
    data: Array<T>
}

/** Plain interface for page pagination response with data array. */
export interface IPaginationPageResponseData<T = unknown> {
    count: number
    data: Array<T>
}
