/** Plain interface for abstract GraphQL response with optional data. */
export interface IAbstractGraphQLResponse<T = undefined> {
    success: boolean
    message: string
    data?: T
    error?: string
}
