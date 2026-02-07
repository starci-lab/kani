/** Object with same keys as T but values coerced to string. */
/**
 * Object with same keys as T but values coerced to string.
 * @param T - The type of the record.
 * @returns The record with the keys coerced to string.
 */
export type ToStringObject<T> = {
    [K in keyof T]: string
}


/**
 * Prefix the keys of a record with a string.
 * @param T - The type of the record.
 * @param P - The prefix to add to the keys.
 * @returns The record with the keys prefixed.
 * @example
 * type User = {
 *     name: string
 *     age: number
 * }
 * type UserWithPrefix = PrefixKeys<User, "user">
 * // { user.name: string, user.age: number }
 */
export type PrefixKeys<T, P extends string> = {
    [K in keyof T as `${P}.${Extract<K, string>}`]: T[K]
}