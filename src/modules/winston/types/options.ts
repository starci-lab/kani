import type {
    ServiceName,
} from "@modules/common"
import type {
    WinstonLevel,
} from "./level"

/** Winston module registration options. */
export interface WinstonOptions {
    serviceName: ServiceName
    id?: string
    level: WinstonLevel
}
