export enum WinstonLevel {
    Debug = "debug",
    Info = "info",
    Warn = "warn",
    Error = "error",
}

export interface WinstonOptions {
    appName: string
    level: WinstonLevel
}