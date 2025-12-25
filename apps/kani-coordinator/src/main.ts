import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { envConfig } from "@modules/env"
import { setupCors } from "@modules/cors"
import compression from "compression"
import { ContextLoggerService } from "@modules/logger"

const bootstrap = async () => {
    const app = await NestFactory.create(AppModule, {
        logger: new ContextLoggerService(),
    })
    setupCors(app)
    app.setGlobalPrefix("api")
    app.use(compression())
    await app.listen(envConfig().ports.kaniCoordinator)
}
bootstrap()
