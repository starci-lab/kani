import {
    Inject 
} from "@nestjs/common"
import {
    CONSOLE_WINSTON, LOKI_WINSTON 
} from "./constants"

export const InjectConsoleWinston = () => Inject(CONSOLE_WINSTON)
export const InjectLokiWinston = () => Inject(LOKI_WINSTON)