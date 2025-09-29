import { Throttle } from "@nestjs/throttler"
import { throttlerConfig, ThrottlerConfig } from "./config"
import { v4 as uuidv4 } from "uuid"

export const UseThrottler = (config: ThrottlerConfig) => {
    const options = 
    Object.fromEntries(
        throttlerConfig[config].map((option) => [uuidv4(), option])
    )
    return Throttle(options)
}