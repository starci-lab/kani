import { AppModule } from "./app.module"
import { NestFactory } from "@nestjs/core"

const bootstrap = async () => {
    await NestFactory.createApplicationContext(AppModule.register({}))
}
bootstrap()
