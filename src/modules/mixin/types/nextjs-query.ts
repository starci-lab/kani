/** Params for GET request via a pre-loaded Next.js page. */
export interface NextJsQueryGetParams {
    baseUrl: string
    path: string
    params?: Record<string, string | number | boolean>
}

/** Result of NextJsQuery get (parsed JSON). */
export type NextJsQueryGetResult<T> = T
