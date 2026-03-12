import {
    Inject 
} from "@nestjs/common"
import {
    NATS 
} from "./constants"

/**
 * Decorator for injecting the NATS connection.
 *
 * @returns Parameter decorator for NATS connection injection
 *
 * @example
 * constructor(@InjectNats() private readonly nc: NatsConnection) {}
 */
export const InjectNats = () => Inject(NATS)
