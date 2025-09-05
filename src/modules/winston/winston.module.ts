import { Module } from "@nestjs/common"
import {
    ConfigurableModuleClass,
    OPTIONS_TYPE,
} from "./winston.module-definition"
import { utilities, WinstonModule as NestWinstonModule } from "nest-winston"
import winston from "winston"
import LokiTransport from "winston-loki"
import { envConfig } from "@modules/env"

@Module({})
export class WinstonModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE) {
        const dynamicModule = super.register(options)
        const winstonModule = NestWinstonModule.forRoot({
            level: options.level,
            transports: [
                // write to console
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json(),
                        utilities.format.nestLike(options.appName, {
                            colors: true,
                            prettyPrint: true,
                            appName: true,
                            processId: true
                        }),
                    ),
                }),
                // write to loki
                new LokiTransport({
                    host: envConfig().loki.host,
                    json: true,
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.ms(),
                        winston.format.json(),
                    ),
                    labels: {
                        environment: envConfig().isProduction,
                        application: options.appName,
                    },
                    basicAuth: envConfig().loki.requireAuth
                        ? `${envConfig().loki.username}:${envConfig().loki.password}`
                        : undefined,
                }),
            ],
        })
        return {
            ...dynamicModule,
            imports: [winstonModule],
            exports: [winstonModule],
        }
    }
}
