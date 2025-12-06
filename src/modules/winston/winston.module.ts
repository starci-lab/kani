import { Module } from "@nestjs/common"
import {
    ConfigurableModuleClass,
    OPTIONS_TYPE,
} from "./winston.module-definition"
import { utilities, WinstonModule as NestWinstonModule } from "nest-winston"
import winston from "winston"
import LokiTransport from "winston-loki"
import { envConfig } from "@modules/env"
import { WinstonLogType } from "./types"

@Module({})
export class WinstonModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE) {
        const dynamicModule = super.register(options)
        const logTypes = options.logTypes
        const transports: Array<winston.transport> = []

        if (!logTypes || logTypes.includes(WinstonLogType.Console)) {
            transports.push(
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json(),
                        utilities.format.nestLike(
                            options.appName, {
                                colors: true,
                                prettyPrint: true,
                                appName: true,
                                processId: true
                            }),
                    ),
                }),
            )
        }
        if (!logTypes || logTypes.includes(WinstonLogType.Loki)) {
            transports.push(
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
            )
        }
        const winstonModule = NestWinstonModule.forRoot({
            level: options.level,
            transports
        })
        return {
            ...dynamicModule,
            imports: [winstonModule],
            exports: [winstonModule],
        }
    }
}
