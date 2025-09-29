import { NestExpressApplication } from "@nestjs/platform-express"

export const trustProxy = (app: NestExpressApplication) => {
    app.set("trust proxy", "loopback")
}