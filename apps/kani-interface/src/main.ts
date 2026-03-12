// we need to initialize sentry before anything else
import "@modules/sentry/instrument"

import {
    NestFactory 
} from "@nestjs/core"
import {
    AppModule 
} from "./app.module"
import {
    envConfig 
} from "@modules/env"
import compression from "compression"
import {
    setupCors 
} from "@modules/cors"
import {
    swaggerBuilder 
} from "@modules/docs"
import {
    RedisIoAdapter 
} from "@modules/socketio"
import {
    createRedisKey, 
    RedisClient,
    RedisInstanceKey
} from "@modules/native"
import {
    ContextLoggerService 
} from "@modules/logger"

const bootstrap = async () => {
    const app = await NestFactory.create(
        AppModule,
        {
            logger: new ContextLoggerService(),
        }
    )
    // set the app to the globalThis object
    globalThis.__APP__ = app
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
    const redis = app.get<RedisClient>(
        createRedisKey(RedisInstanceKey.Adapter), 
        {
            strict: false 
        }
    )
    const redisIoAdapter = new RedisIoAdapter(app)
    redisIoAdapter.setClient(redis)
    await redisIoAdapter.connect()
    app.useWebSocketAdapter(redisIoAdapter)
    await app.listen(envConfig().ports.kaniInterface)
}
bootstrap()
