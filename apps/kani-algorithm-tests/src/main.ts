import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"

const bootstrap = async () => {
    const app = await NestFactory.createApplicationContext(AppModule)
    await app.init()
    console.log("App module created")
}
bootstrap()
//nest start kani-algorithm-tests -w