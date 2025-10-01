import { INestApplication } from "@nestjs/common"
import { envConfig } from "@modules/env"
export const setupCors = (app: INestApplication) => {
    app.enableCors({
        // allow specific origins
        origin: envConfig().cors.origins,
        // allow credentials
        credentials: true,
    })
}
