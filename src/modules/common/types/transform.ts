/** Object with same keys as T but values coerced to string. */
export type ToStringObject<T> = {
    [K in keyof T]: string
}
