import winston, {
    format, transports, createLogger
} from "winston"
import {
    CONSOLE_WINSTON, LOKI_WINSTON 
} from "./constants"
import {
    utilities 
} from "nest-winston"
import {
    MODULE_OPTIONS_TOKEN, OPTIONS_TYPE 
} from "./winston.module-definition"
import LokiTransport from "winston-loki"
import {
    envConfig 
} from "@modules/env/config"

export const createConsoleTransport = (
    options: typeof OPTIONS_TYPE
) => {
    return new transports.Console({
        format: format.combine(
            format.timestamp(),
            format.json(),
            utilities.format.nestLike(
                options.appName,
                {
                    colors: true,
                    prettyPrint: true,
                    appName: true,
                    processId: true
                }
            ),
        ),
    })
}

export const createLokiTransport = (
    options: typeof OPTIONS_TYPE
) => {
    return new LokiTransport({
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
    })
}

export const createConsoleWinstonProvider = () => {
    return {
        provide: CONSOLE_WINSTON,
        inject: [MODULE_OPTIONS_TOKEN],
        useFactory: (
            options: typeof OPTIONS_TYPE
        ) => {
            return createLogger(
                {
                    level: options.level,
                    transports: [
                        createConsoleTransport(options),
                    ],
                }
            )
        },
    }
}

export const createLokiWinstonProvider = () => {
    return {
        provide: LOKI_WINSTON,
        inject: [MODULE_OPTIONS_TOKEN],
        useFactory: (
            options: typeof OPTIONS_TYPE
        ) => {
            return createLogger(
                {
                    level: options.level,
                    transports: [
                        createConsoleTransport(options),
                        createLokiTransport(options),
                    ],
                }
            )
        }
    }
}   