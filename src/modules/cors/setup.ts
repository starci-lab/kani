import { INestApplication } from "@nestjs/common"
import { envConfig } from "@modules/env"
import { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface"

/**
 * Create cors options
 */
export const createCorsOptions = (): CorsOptions => ({
    origin: envConfig().cors.origins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
})

/**
 * Setup cors for NestJS application
 */
export const setupCors = (app: INestApplication) => {
    app.enableCors(createCorsOptions())
}

