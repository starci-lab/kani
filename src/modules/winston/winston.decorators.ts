import {
    Inject
} from "@nestjs/common"
import {
    CONSOLE_WINSTON,
    LOKI_WINSTON,
    WINSTON_AND_CONSOLE,
} from "./constants"

export const InjectConsoleWinston = () => Inject(CONSOLE_WINSTON)
export const InjectLokiWinston = () => Inject(LOKI_WINSTON)
export const InjectWinstonAndConsole = () => Inject(WINSTON_AND_CONSOLE)