import {
    ConsoleLogger 
} from "@nestjs/common"

export class ContextLoggerService extends ConsoleLogger {
    log(...params: Parameters<ConsoleLogger["log"]>) {
        if (params[1] === "ClientProxy") return
        super.log(...params)
    }
    debug() {
        return false
    }
    fatal() {
        return false
    }  
}
