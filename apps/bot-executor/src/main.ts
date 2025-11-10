import { NestFactory } from "@nestjs/core"
import { BotExecutorModule } from "./bot-executor.module"

const bootstrap = async () => {
    const app = await NestFactory.createApplicationContext(BotExecutorModule)
    await app.init()
}
bootstrap()
