import {
    Throttle 
} from "@nestjs/throttler"
import {
    throttlerConfig 
} from "./config"
import {
    v4 as uuidv4 
} from "uuid"
import {
    ThrottlerConfig 
} from "./enums"

/**
 * The decorator for the throttler.
 * @param config - The config for the throttler.
 * @returns The decorator for the throttler.
 */
export const UseThrottler = (config: ThrottlerConfig) => {
    const options = 
    Object.fromEntries(
        throttlerConfig[config].map((option) => [uuidv4(),
            option])
    )
    return Throttle(options)
}