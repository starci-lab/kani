import { Injectable } from "@nestjs/common"
import pRetry, { Options } from "p-retry"
import { envConfig } from "@modules/env"

export interface RetryParams<T> {
    action: () => Promise<T> | T;
    options?: RetryOptions;
}

@Injectable()
export class RetryService {
    // retry the action
    async retry<T>(
        {
            // define the action
            action,
            // define the options
            options,
        }: RetryParams<T>): Promise<T> {
        return await pRetry(
            action, {
                ...options,
                retries: options?.retries ?? envConfig().timeConfig.retry.base.retries,
                factor: options?.factor ?? envConfig().timeConfig.retry.base.factor, // exponential backoff factor
                minTimeout: options?.minTimeout ?? envConfig().timeConfig.retry.base.minTimeout,
                maxTimeout: options?.maxTimeout ?? envConfig().timeConfig.retry.base.maxTimeout,
                randomize: options?.randomize ?? envConfig().timeConfig.retry.base.randomize,
            }
        )
    }
}

export type RetryOptions = Options