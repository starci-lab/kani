import {
    Injectable
} from "@nestjs/common"
import {
    InjectConsoleWinston, InjectLokiWinston 
} from "./winston.decorators"
import {
    configMap,
} from "./config"
import {
    WinstonLog,
} from "./enums"
import {
    WinstonLevel,
} from "./types"
import {
    Logger 
} from "winston"
import _ from "lodash"

/**
 * The service for the Winston.
 */
@Injectable()
export class WinstonService {
    constructor(
        @InjectConsoleWinston()
        private readonly consoleLogger: Logger,
        @InjectLokiWinston()
        private readonly lokiLogger: Logger,
    ) {}

    /**
     * Log a message.
     * @param name - The name of the log.
     * @param message - The message to log.
     * @returns void.
     */
    public log<TName extends WinstonLog>(
        name: TName,
        message: (typeof configMap)[TName]["messageType"],
    ) {
        // remove undefined values from the message
        const _message = _.omitBy(message,
            _.isUndefined)
        const config = configMap[name]
        if (config.loki) {
            switch (config.level) {
            case WinstonLevel.Error: {
                this.lokiLogger.error(
                    config.name,
                    _message)
                break
            }
            case WinstonLevel.Verbose: {
                this.lokiLogger.verbose(
                    config.name,
                    _message)
                break
            }
            case WinstonLevel.Debug: {
                this.lokiLogger.debug(
                    config.name,
                    _message)
                break
            }
            case WinstonLevel.Fatal: {
                this.lokiLogger.error(
                    config.name,
                    _message)
                break
            }
            case WinstonLevel.Warn: {
                this.lokiLogger.warn(
                    config.name,
                    _message)
                break
            }
            default: {
                this.lokiLogger.info(
                    config.name,
                    message)
                break
            }
            }
        } else {
            switch (config.level) {
            case WinstonLevel.Error: {
                this.consoleLogger.error(
                    config.name,
                    _message)
                break
            }
            case WinstonLevel.Verbose: {
                this.consoleLogger.verbose(
                    config.name,
                    _message)
                break
            }
            case WinstonLevel.Debug: {
                this.consoleLogger.debug(
                    config.name,
                    _message)
                break
            }
            case WinstonLevel.Fatal: {
                this.consoleLogger.error(
                    config.name,
                    _message)
                break
            }
            case WinstonLevel.Warn: {
                this.consoleLogger.warn(
                    config.name,
                    _message)
                break
            }
            default: {
                this.consoleLogger.info(
                    config.name,
                    _message)
                break
            }
            }
        }
    }
}