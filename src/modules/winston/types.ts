export enum WinstonLevel {
    Debug = "debug",
    Info = "info",
    Warn = "warn",
    Error = "error",
    Fatal = "fatal",
    Verbose = "verbose",
}

export enum WinstonLogType {
    Console = "console",
    Loki = "loki",
}

export interface WinstonOptions {
    appName: string
    level: WinstonLevel
}

export interface WinstonLogConfig<TName, TMessage> {
    // the name of the log
    name: TName
    // the level of the log
    level: WinstonLevel
    // whether to log to loki
    loki?: boolean
    // the type of the log
    messageType: TMessage
}