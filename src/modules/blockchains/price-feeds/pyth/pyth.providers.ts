import {
    Provider 
} from "@nestjs/common"
import {
    HERMES_CLIENT 
} from "./constants"
import {
    HermesClient 
} from "@pythnetwork/hermes-client"

/**
 * Creates a NestJS provider for Pyth Hermes client.
 * Initializes and provides the Hermes client instance for dependency injection.
 *
 * @returns Provider configuration for Hermes client
 *
 * @example
 * const provider = createHermesClientProvider()
 */
export const createHermesClientProvider = (): Provider<HermesClient> => ({
    provide: HERMES_CLIENT,
    useFactory: () => {
        // Initialize Hermes client with Pyth network endpoint
        return new HermesClient("https://hermes.pyth.network")
    }
})