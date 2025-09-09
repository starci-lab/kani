export enum WinstonLevel {
    Debug = "debug",
    Info = "info",
    Warn = "warn",
    Error = "error",
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