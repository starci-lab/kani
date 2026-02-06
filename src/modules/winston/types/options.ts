import type {
    WinstonLevel,
} from "./level"

/** Winston module registration options. */
export interface WinstonOptions {
    appName: string
    level: WinstonLevel
}
