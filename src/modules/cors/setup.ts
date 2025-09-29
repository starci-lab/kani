import { INestApplication } from "@nestjs/common"
export const setupCors = (app: INestApplication) => {
    app.enableCors({
        credentials: true,
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
}
