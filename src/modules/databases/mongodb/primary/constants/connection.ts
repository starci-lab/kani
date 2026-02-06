import {
    getConnectionToken 
} from "@nestjs/mongoose"

/** Default connection name for the primary MongoDB connection. */
export const CONNECTION_NAME = "primary"

/**
 * Returns the NestJS injection token for the primary MongoDB connection.
 *
 * @returns Connection token for dependency injection
 */
export const getPrimaryConnectionToken = (): string =>
    getConnectionToken(CONNECTION_NAME)
