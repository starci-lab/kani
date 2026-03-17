import {
    Injectable,
} from "@nestjs/common"
import {
    InjectConsoleWinston,
    InjectLokiWinston,
    InjectWinstonAndConsole,
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
    Logger,
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
        @InjectWinstonAndConsole()
        private readonly winstonAndConsoleLogger: Logger,
    ) {}

    /**
     * Log a message.
     * Chooses logger from config: console only, loki only, or both (winston + console).
     *
     * @param name - The name of the log.
     * @param message - The message to log.
     */
    public log<TName extends WinstonLog>(
        name: TName,
        message: (typeof configMap)[TName]["messageType"],
    ): void {
        const _message = _.omitBy(message,
            _.isUndefined)
        const config = configMap[name]
        const logger = this.getLogger(config)
        if (!logger) {
            return
        }
        switch (config.level) {
        case WinstonLevel.Error: {
            logger.error(config.name,
                _message)
            break
        }
        case WinstonLevel.Verbose: {
            logger.verbose(config.name,
                _message)
            break
        }
        case WinstonLevel.Debug: {
            logger.debug(config.name,
                _message)
            break
        }
        case WinstonLevel.Fatal: {
            logger.error(config.name,
                _message)
            break
        }
        case WinstonLevel.Warn: {
            logger.warn(config.name,
                _message)
            break
        }
        default: {
            logger.info(config.name,
                _message)
            break
        }
        }
    }

    /**
     * Resolve which logger to use from config.console and config.loki.
     */
    private getLogger(config: { console?: boolean; loki?: boolean }): Logger | null {
        const useConsole = config.console !== false
        const useLoki = config.loki === true
        if (useConsole && useLoki) {
            return this.winstonAndConsoleLogger
        }
        if (useConsole) {
            return this.consoleLogger
        }
        if (useLoki) {
            return this.lokiLogger
        }
        return null
    }
}
