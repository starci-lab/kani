import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { envConfig } from "@modules/env"
import compression from "compression"
import { setupCors } from "@modules/cors"
import { swaggerBuilder } from "@modules/docs"
import { AuthenticatedRedisIoAdapter } from "@modules/socketio"

const bootstrap = async () => {
    const app = await NestFactory.create(AppModule)
    setupCors(app)
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
    app.use(compression())
    const redisIoAdapter = new AuthenticatedRedisIoAdapter(app)
    await redisIoAdapter.connectToRedis()
    app.useWebSocketAdapter(redisIoAdapter)
    app.use(compression())
    await app.listen(envConfig().ports.kaniInterface)
}
bootstrap()
