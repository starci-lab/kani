import winston, {
    format, transports, createLogger
} from "winston"
import {
    CONSOLE_WINSTON,
    LOKI_WINSTON,
    WINSTON_AND_CONSOLE,
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
} from "@modules/env"
import {
    buildAppName,
} from "./utils"

/**
 * Create a console transport.
 */
export const createConsoleTransport = (
    options: typeof OPTIONS_TYPE
) => {
    const appName = buildAppName(
        options.serviceName,
        options.id
    )
    return new transports.Console({
        format: format.combine(
            format.timestamp(),
            format.json(),
            utilities.format.nestLike(
                appName,
                {
                    colors: true,
                    prettyPrint: true,
                    appName: true,
                    processId: true
                },
            ),
        ),
    })
}

/**
 * Create a Loki transport.
 */
export const createLokiTransport = (
    options: typeof OPTIONS_TYPE
) => {
    const appName = buildAppName(options.serviceName,
        options.id)
    return new LokiTransport(
        {
            host: envConfig().loki.host,
            json: true,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.ms(),
                winston.format.json(),
            ),
            labels: {
                environment: envConfig().isProduction,
                application: appName,
            },
            basicAuth: envConfig().loki.requireAuth
                ? `${envConfig().loki.username}:${envConfig().loki.password}`
                : undefined,
        }
    )
}

/**
 * Provider: logger with console transport only.
 */
export const createConsoleOnlyWinstonProvider = () => {
    return {
        provide: CONSOLE_WINSTON,
        inject: [MODULE_OPTIONS_TOKEN],
        useFactory: (options: typeof OPTIONS_TYPE) => {
            return createLogger({
                level: options.level,
                transports: [
                    ...((options.useConsole ?? true) ? [createConsoleTransport(options)] : []),
                ]
            })
        },
    }
}

/**
 * Provider: logger with Loki transport only.
 */
export const createLokiOnlyWinstonProvider = () => {
    return {
        provide: LOKI_WINSTON,
        inject: [MODULE_OPTIONS_TOKEN],
        useFactory: (options: typeof OPTIONS_TYPE) => {
            return createLogger({
                level: options.level,
                transports: [
                    createLokiTransport(options)
                ],
            })
        },
    }
}

/**
 * Provider: logger with both console and Loki transports (winston + console).
 */
export const createWinstonAndConsoleProvider = () => {
    return {
        provide: WINSTON_AND_CONSOLE,
        inject: [MODULE_OPTIONS_TOKEN],
        useFactory: (options: typeof OPTIONS_TYPE) => {
            return createLogger({
                level: options.level,
                transports: [
                    ...((options.useConsole ?? true) ? [createConsoleTransport(options)] : []),
                    createLokiTransport(options),
                ],
            })
        },
    }
}
