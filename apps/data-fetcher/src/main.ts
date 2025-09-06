import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import fs from "fs"

const bootstrap = async () => {
    const app = await NestFactory.create(AppModule)
    fs.writeFileSync("env", JSON.stringify(process.env))
    await app.listen(process.env.port ?? 3011)
}
bootstrap()
