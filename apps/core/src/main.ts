import "@modules/sentry/instrument"
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { envConfig } from "@modules/env"
import { swaggerBuilder } from "@modules/docs"
import { setupCors } from "@modules/cors"
import { AuthenticatedRedisIoAdapter } from "@modules/socketio"
import compression from "compression"

const bootstrap = async () => {
    const app = await NestFactory.create(AppModule)
    // build swagger
    swaggerBuilder({
        app,
        title: "Kani API",
        description:
      "Kani API provides secure and structured access to the core backend services. \
It includes authentication, data management, and various business logic endpoints \
for powering Kani's applications and integrations.",
        version: "1.0.0",
        basePath: "/api",
        swaggerEndpoint: "/swagger",
        scalarDocsEndpoint: "/scalar",
        enableAuthentication: true,
        authenticationType: "bearer",
        authenticationName: "Authorization",
        enableVersioning: true,
    })
    setupCors(app)
    // use the authenticated redis io adapter
    const redisIoAdapter = new AuthenticatedRedisIoAdapter(app)
    await redisIoAdapter.connectToRedis()
    app.useWebSocketAdapter(redisIoAdapter)
    app.use(compression())
    // start the app
    await app.listen(envConfig().port.core)
}
bootstrap()
