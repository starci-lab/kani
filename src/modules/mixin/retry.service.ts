import { 
    WsConnectionAbortedException, 
    WsConnectionTimeoutException, 
    WsRetryLimitReachedException 
} from "@exceptions"
import { Injectable } from "@nestjs/common"
import { sleep } from "@utils"
import pRetry from "p-retry"
import { envConfig } from "@modules/env"

export interface RetryParams<T> {
  signal?: AbortSignal;
  action: () => Promise<T> | T;
  maxRetries?: number;
  delay?: number;
  factor?: number;
}

@Injectable()
export class RetryService {
    async retry<T>({
        action,
        signal,
        maxRetries = 5,
        delay = 100,
        factor = 2,
    }: RetryParams<T>): Promise<T> {
        return await pRetry(
            action, {
                retries: maxRetries,
                factor, // exponential backoff factor
                minTimeout: delay,
                maxTimeout: delay * 10,
                randomize: true, // jitter
                signal
            })
    }

    private async retryWsInternal<T>(params: WsRetryParams<T>): Promise<never> { 
        const {
            closeFnName = "close",
            createConnection,
            onOpen,
            onReconnect,
            onFatal,
            options,
        } = params
        // destruct the options
        const {
            maxRetries = Infinity,
            baseDelay = 1000,
            maxDelay = 30_000,
            factor = 2,
            jitter = true,
            signal,
        } = options
        // initialize the retries and connection
        let retries = 0
        let connection: T | null = null
        let aborted = false
        // create a promise to return the connection
        return new Promise<never>((_, reject) => {
            const safe = async (fn?: () => Promise<void>) => {
                try {
                    await fn?.()
                } catch {
                    // do nothing
                }
            }
            const cleanup = () => {
                connection?.[closeFnName]?.()
                connection = null
            }
            const connect = async () => {
                if (aborted) return
                try {
                    let timeout: NodeJS.Timeout | null = null
                    await Promise.race(
                        [
                            new Promise<never>((_, reject) =>
                                timeout = setTimeout(
                                    () =>
                                        reject(
                                            new WsConnectionTimeoutException("WS connection timed out")
                                        ),
                                    envConfig().timeConfig.wsTimeout
                                )
                            ),
                            (async () => {
                                const connection = await createConnection()
                                await onOpen(
                                    connection, () => {
                                        if (timeout) {
                                            clearTimeout(timeout)
                                            timeout = null
                                        }
                                    })
                            })(),
                        ]
                    )
                } catch (err) {
                    await scheduleReconnect(err)
                }
            }
            // schedule the next reconnect if the connection is closed or an error occurs
            const scheduleReconnect = async (err?: Error) => {
                if (aborted) return
                // call the onReconnect callback
                await safe(async () => onReconnect?.(err))
                // cleanup the connection
                cleanup()
                // increment the retries
                retries++
                if (retries > maxRetries) {
                    aborted = true
                    await safe(onFatal)
                    return reject(
                        new WsRetryLimitReachedException(retries, "WS connection failed"),
                    )
                }
                // calculate the delay
                let delay = Math.min(baseDelay * factor ** retries, maxDelay)
                if (jitter) delay += delay * Math.random() * 0.3
                // sleep for the delay
                await sleep(delay)
                // connect to the server
                await connect()
            }
        
            // handle the abort signal
            signal?.addEventListener("abort", async () => {
                if (aborted) return
                aborted = true
                // call the onFatal callback
                await safe(onFatal)
                // cleanup the connection
                cleanup()
                // reject the promise
                reject(new WsConnectionAbortedException("WS connection aborted"))
            }, {
                once: true,
            })
        
            // connect to the server
            connect()
        })
    }

    async retryWs<T>(params: WsRetryParams<T>): Promise<void> {
        try {
            return await this.retryWsInternal(params)
        } catch (err) {
            if (params.throwOnFatal) {
                throw err
            }
        }
    }
}

export interface WsRetryOptions {
    maxRetries?: number
    baseDelay?: number
    maxDelay?: number
    factor?: number
    jitter?: boolean
    signal?: AbortSignal
}

export interface WsRetryParams<T> {
    closeFnName?: string
    createConnection: () => Promise<T> | T
    onOpen: (connection: T, markMessageReceived?: () => void) => Promise<void>
    onReconnect?: (error?: Error) => Promise<void>
    onFatal?: () => Promise<void>
    options: WsRetryOptions
    throwOnFatal?: boolean
}