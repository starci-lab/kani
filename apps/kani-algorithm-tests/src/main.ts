import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"

const bootstrap = async () => {
    const app = await NestFactory.createApplicationContext(AppModule)
    const helloWorldScripts = "for (let i = 0; i < 10; i++) { console.log(i) }"
    // new fn to execute the scripts
    new Function(helloWorldScripts)()
    await app.init()
    console.log("App module created")
}
bootstrap()
//nest start kani-algorithm-tests -w