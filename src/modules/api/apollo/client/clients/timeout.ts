import {
    ApolloLink, Observable 
} from "@apollo/client"
import {
    envConfig 
} from "@modules/env"

/**
 * Creates an Apollo link that fails the operation after a configured timeout (from env).
 *
 * @returns ApolloLink that enforces request timeout
 *
 * @example
 * const link = createTimeoutLink()
 */
export const createTimeoutLink = () => {
    const timeoutMs = envConfig().client.apollo.timeout.ms

    return new ApolloLink((operation, forward) => {
        return new Observable((observer) => {
            // schedule timeout error
            const timer = setTimeout(() => {
                observer.error(
                    new Error(`GraphQL request timed out after ${timeoutMs}ms`)
                )
            },
            timeoutMs)

            const sub = forward(operation).subscribe({
                next: (value) => observer.next(value),
                error: (err) => {
                    clearTimeout(timer)
                    observer.error(err)
                },
                complete: () => {
                    clearTimeout(timer)
                    observer.complete()
                },
            })

            return () => {
                clearTimeout(timer)
                sub.unsubscribe()
            }
        })
    })
}
