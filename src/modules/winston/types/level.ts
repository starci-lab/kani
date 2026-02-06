/** Winston log level. */
export enum WinstonLevel {
    Debug = "debug",
    Info = "info",
    Warn = "warn",
    Error = "error",
    Fatal = "fatal",
    Verbose = "verbose",
}

/** Winston log transport type. */
export enum WinstonLogType {
    Console = "console",
    Loki = "loki",
}
