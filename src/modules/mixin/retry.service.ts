import {
    Injectable
} from "@nestjs/common"
import pRetry from "p-retry"
import {
    envConfig
} from "@modules/env"
import type {
    RetryParams
} from "./types"

/**
 * Service for retrying actions.
 */
@Injectable()
export class RetryService {
    /**
     * Retry an action with configurable options.
     * @param params - The parameters for the retry.
     * @returns The result of the action.
     */
    async retry<T>({ action, options }: RetryParams<T>): Promise<T> {
        return await pRetry(action,
            {
                ...options,
                retries: options?.retries ?? envConfig().retry.base.retries,
                factor: options?.factor ?? envConfig().retry.base.factor,
                minTimeout: options?.minTimeout ?? envConfig().retry.base.minTimeout,
                maxTimeout: options?.maxTimeout ?? envConfig().retry.base.maxTimeout,
                randomize: options?.randomize ?? envConfig().retry.base.randomize,
            })
    }
}
