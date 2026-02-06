import type {
    WinstonLevel,
} from "./level"

/** Config entry for a log name: level, loki flag, message type. */
export interface WinstonLogConfig<TName, TMessage> {
    name: TName
    level: WinstonLevel
    loki?: boolean
    messageType: TMessage
}
