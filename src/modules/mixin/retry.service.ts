import { Injectable, Logger } from "@nestjs/common"
import pRetry from "p-retry"

export interface RetryParams<T> {
  signal?: AbortSignal;
  action: () => Promise<T> | T;
  maxRetries?: number;
  delay?: number;
  factor?: number;
  log?: boolean;
}

@Injectable()
export class RetryService {
    private readonly logger = new Logger(RetryService.name)
    constructor() {}


    async retry<T>({
        action,
        signal,
        maxRetries = 5,
        delay = 100,
        factor = 2,
        log = true,
    }: RetryParams<T>): Promise<T> {
        try {
            return await pRetry(
                action, {
                    retries: maxRetries,
                    factor, // exponential backoff factor
                    minTimeout: delay,
                    maxTimeout: delay * 10,
                    randomize: true, // jitter
                    signal
                })
        } catch (error) {
            if (log) {
                this.logger.error(
                    `Error retrying action: ${error.message}`,
                    error.stack,
                ) 
            }
            throw error
        }
    }
}
