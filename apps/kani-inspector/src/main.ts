import {
    NestFactory 
} from "@nestjs/core"
import {
    AppModule 
} from "./app.module"
import {
    envConfig 
} from "@modules/env"
import {
    setupCors 
} from "@modules/cors"
import compression from "compression"

const bootstrap = async () => {
    const app = await NestFactory.create(AppModule)
    setupCors(app)
    app.setGlobalPrefix("api")
    app.use(compression())
    await app.listen(envConfig().ports.kaniInspector)
}
bootstrap()
