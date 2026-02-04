import {
    Injectable,
} from "@nestjs/common"
import pRetry from "p-retry"
import {
    envConfig,
} from "@modules/env"
import {
    WaitTimeoutException,
    WaitConditionNotMetException,
} from "@modules/exceptions"

@Injectable()
export class WaitService {
    /**
     * Polls fn until it returns true or max attempts exceeded.
     * p-retry retries when fn throws; we throw when fn returns false to trigger retry.
     *
     * @param params.action - Returns true when condition is met, false otherwise
     * @param params.maxAttempts - Max retry attempts (default from env)
     * @param params.intervalMs - Override minTimeout for first retry (default from env)
     * @param params.throwOnFail - If true, throws WaitTimeoutException when condition never met
     * @returns true when condition met, false when failed and throwOnFail is false
     */
    async wait(
        {
            action,
            maxAttempts = envConfig().wait.base.retries,
            intervalMs = envConfig().wait.base.intervalMs,
            throwOnFail = false,
        }: WaitParams
    ): Promise<boolean> {
        const wrappedFn = async (): Promise<boolean> => {
            const result = await action()
            if (result) return true
            throw new WaitConditionNotMetException({
            })
        }

        try {
            return await pRetry(
                wrappedFn,
                {
                    retries: maxAttempts,
                    minTimeout: intervalMs,
                    maxTimeout: intervalMs,
                },
            )
        } catch (error) {
            if (throwOnFail) {
                throw new WaitTimeoutException(
                    {
                        maxAttempts,
                        originalError: error instanceof Error ? error : undefined,
                    },
                )
            }
            return false
        }
    }
}

export interface WaitParams {
    action: () => Promise<boolean> | boolean
    maxAttempts?: number
    intervalMs?: number
    throwOnFail?: boolean
}
