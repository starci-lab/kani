import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"

Error.stackTraceLimit = 100

const bootstrap = async () => {
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ["log", "error"],
    })
    await app.init()
}
bootstrap()
