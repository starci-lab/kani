/** Result of resolveTuple: [value, null] on success or [null, error] on failure. */
export type ResolveTupleResult<T> = [T, null] | [null, Error]
