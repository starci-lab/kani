import {
    Injectable
} from "@nestjs/common"
import {
    InjectConsoleWinston, InjectLokiWinston 
} from "./winston.decorators"
import {
    configMap, WinstonLog 
} from "./config"
import {
    WinstonLevel 
} from "./types"
import {
    Logger 
} from "winston"

@Injectable()
export class WinstonService {
    constructor(
        @InjectConsoleWinston()
        private readonly consoleLogger: Logger,
        @InjectLokiWinston()
        private readonly lokiLogger: Logger,
    ) {}

    log<TName extends WinstonLog>(
        name: TName,
        message: (typeof configMap)[TName]["messageType"],
    ) {
        const config = configMap[name]
        if (config.loki) {
            switch (config.level) {
            case WinstonLevel.Error: {
                this.lokiLogger.error(
                    config.name,
                    message)
                break
            }
            case WinstonLevel.Verbose: {
                this.lokiLogger.verbose(
                    config.name,
                    message)
                break
            }
            case WinstonLevel.Debug: {
                this.lokiLogger.debug(
                    config.name,
                    message)
                break
            }
            case WinstonLevel.Fatal: {
                this.lokiLogger.error(
                    config.name,
                    message)
                break
            }
            case WinstonLevel.Warn: {
                this.lokiLogger.warn(
                    config.name,
                    message)
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
                    message)
                break
            }
            case WinstonLevel.Verbose: {
                this.consoleLogger.verbose(
                    config.name,
                    message)
                break
            }
            case WinstonLevel.Debug: {
                this.consoleLogger.debug(
                    config.name,
                    message)
                break
            }
            case WinstonLevel.Fatal: {
                this.consoleLogger.error(
                    config.name,
                    message)
                break
            }
            case WinstonLevel.Warn: {
                this.consoleLogger.warn(
                    config.name,
                    message)
                break
            }
            default: {
                this.consoleLogger.info(
                    config.name,
                    message)
                break
            }
            }
        }
    }
}