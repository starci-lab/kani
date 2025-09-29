import { INestApplication, VersioningType } from "@nestjs/common"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import { apiReference } from "@scalar/nestjs-api-reference"

export interface SwaggerBuilderParams {
  app: INestApplication
  title: string
  description: string
  version: string
  basePath: string
  enableVersioning?: boolean
  enableAuthentication: boolean
  authenticationType: "bearer" | "apiKey"
  authenticationName: string
  useScalarDocs?: boolean
  scalarDocsEndpoint?: string
  swaggerEndpoint?: string
}

export const swaggerBuilder = (params: SwaggerBuilderParams) => {
    const {
        app,
        title,
        description,
        version,
        basePath,
        enableVersioning = true,
        enableAuthentication,
        authenticationType,
        authenticationName,
        useScalarDocs = true,
        scalarDocsEndpoint = "scalar",
        swaggerEndpoint = "swagger",
    } = params

    // Build swagger config
    const builder = new DocumentBuilder()
        .setTitle(title)
        .setDescription(description)
        .setVersion(version)
    
    // Enable versioning
    if (enableVersioning) {
        app.enableVersioning({
            type: VersioningType.URI,
        })
    }
    // Set global prefix
    app.setGlobalPrefix(basePath)

    if (enableAuthentication) {
        if (authenticationType === "bearer") {
            builder.addBearerAuth(undefined, authenticationName)
        } else if (authenticationType === "apiKey") {
            builder.addApiKey(
                { type: "apiKey", name: authenticationName, in: "header" },
                authenticationName,
            )
        }
    }

    if (useScalarDocs) {
        builder.addBearerAuth(undefined, authenticationName)
    }

    const options = builder.build()

    // Create swagger document
    const document = SwaggerModule.createDocument(app, options)

    // Serve Swagger UI (default: /swagger)
    if (swaggerEndpoint) {
        SwaggerModule.setup(swaggerEndpoint, app, document)
    }

    // Serve Scalar Docs (default: /scalar)
    if (useScalarDocs) {
        app.use(
            scalarDocsEndpoint,
            apiReference({
                content: document,
                customCss: `
          body { font-family: 'JetBrains Mono', monospace; }
        `,
            }),
        )
    }
}