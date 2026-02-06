import {
    Inject 
} from "@nestjs/common"
import {
    HERMES_CLIENT 
} from "./constants"

/**
 * Decorator factory for injecting Hermes client into services.
 * Provides a convenient way to inject the Pyth Hermes client dependency.
 *
 * @returns Parameter decorator for dependency injection
 *
 * @example
 * constructor(@InjectHermesClient() private readonly hermesClient: HermesClient) {}
 */
export const InjectHermesClient = () => Inject(HERMES_CLIENT)