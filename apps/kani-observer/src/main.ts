import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import compression from "compression"
import { envConfig } from "@modules/env"
import { setupCors } from "@modules/cors"

const bootstrap = async () => {
    const app = await NestFactory.create(AppModule, {
        logger: ["log", "error"],
    })
    setupCors(app)
    app.setGlobalPrefix("api")
    app.use(compression())
    await app.listen(envConfig().ports.kaniObserver)
}
bootstrap()
