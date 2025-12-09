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
    logTypes?: Array<WinstonLogType>
}