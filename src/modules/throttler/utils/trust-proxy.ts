import type {
    NestExpressApplication
} from "@nestjs/platform-express"

/**
 * Enable trust proxy for loopback (e.g. behind reverse proxy).
 */
export const trustProxy = (app: NestExpressApplication): void => {
    app.set(
        "trust proxy",
        "loopback",
    )
}
