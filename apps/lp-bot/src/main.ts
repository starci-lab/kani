import { VersioningType } from "@nestjs/common"
import { AppModule } from "./app.module"
import { NestFactory } from "@nestjs/core"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import { apiReference  } from "@scalar/nestjs-api-reference"

const bootstrap = async () => {
    const app = await NestFactory.create(AppModule.register({}), {
        logger: ["log"],
    })
    const options = new DocumentBuilder()
        .setTitle("Liquidity Pool Bot Specification")
        .setDescription("Liquidity Pool Bot Specification")
        .setBasePath("/api")
        .build()
    app.setGlobalPrefix("api")
    app.enableVersioning({
        type: VersioningType.URI,
    })
    const document = SwaggerModule.createDocument(app, options)
    app.use("/docs", apiReference({
        content: document,
        customCss: `
          body { font-family: 'JetBrains Mono', monospace; }
        `,
    }))
    await app.listen(process.env.port ?? 6969)
}
bootstrap()
