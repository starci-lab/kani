import {
    Injectable
} from "@nestjs/common"
import pRetry from "p-retry"
import {
    envConfig
} from "@modules/env"
import {
    WaitConditionNotMetException,
    WaitTimeoutException
} from "@modules/exceptions"
import type {
    WaitParams
} from "./types"

/**
 * Service for waiting for a condition to be met.
 */
@Injectable()
export class WaitService {
    /**
     * Poll until condition is met or max attempts exceeded.
     *
     * @param params.action - Returns true when condition is met, false otherwise
     * @param params.maxAttempts - Max retry attempts (default from env)
     * @param params.intervalMs - Interval between attempts (default from env)
     * @param params.throwOnFail - If true, throws when condition never met
     * @returns true when condition met, false when failed and throwOnFail is false
     */
    async wait({
        action,
        maxAttempts = envConfig().wait.base.retries,
        intervalMs = envConfig().wait.base.intervalMs,
        throwOnFail = false,
    }: WaitParams): Promise<boolean> {
        const wrappedFn = async (): Promise<boolean> => {
            const result = await action()
            if (result) return true
            throw new WaitConditionNotMetException({
            })
        }
        try {
            return await pRetry(wrappedFn,
                {
                    retries: maxAttempts,
                    minTimeout: intervalMs,
                    maxTimeout: intervalMs,
                })
        } catch (error) {
            if (throwOnFail) {
                throw new WaitTimeoutException({
                    maxAttempts,
                    originalError: error instanceof Error ? error : undefined,
                })
            }
            return false
        }
    }
}
