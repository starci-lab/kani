import {
    WsConnectionAbortedException,
    WsConnectionTimeoutException,
    WsRetryLimitReachedException
} from "@exceptions"
import { Injectable } from "@nestjs/common"
import { sleep } from "@utils"
import pRetry from "p-retry"
import { envConfig } from "@modules/env"
import Decimal from "decimal.js"
import { catchError, from, lastValueFrom, race, Subject, switchMap, timeout } from "rxjs"

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

    private retryWsInternal<T>(params: WsRetryParams<T>): Promise<never> {
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
            // cleanup the connection
            const cleanup = () => {
                connection?.[closeFnName]?.()
                connection = null
            }
            const connect = async () => {
                if (aborted) return

                const heartbeat$ = new Subject<void>()

                const connect$ = from(
                    (async () => {
                        connection = await createConnection()

                        await onOpen(connection, () => {
                            heartbeat$.next()
                        })

                        return connection
                    })()
                )

                const idleTimeout$ = heartbeat$.pipe(
                    timeout({ each: envConfig().timeConfig.ws.idleTimeout }),
                    switchMap(() => {
                        throw new WsConnectionTimeoutException("WS connection timed out")
                    })
                )

                try {
                    await lastValueFrom(
                        race(connect$, idleTimeout$).pipe(
                            catchError(err => {
                                throw err
                            })
                        )
                    )
                } catch (err) {
                    await scheduleReconnect(err)
                }
            }
            // schedule the next reconnect if the connection is closed or an error occurs
            const scheduleReconnect = async (err?: Error) => {
                if (aborted) return
                // call the onReconnect callback
                await onReconnect?.(err)
                // cleanup the connection
                cleanup()
                // increment the retries
                retries++
                if (retries > maxRetries) {
                    aborted = true
                    await onFatal?.()
                    return reject(
                        new WsRetryLimitReachedException(retries, "WS connection failed"),
                    )
                }
                // calculate the delay
                let delay = Decimal.min(new Decimal(baseDelay).mul(new Decimal(factor).pow(new Decimal(retries))), new Decimal(maxDelay))
                if (jitter) delay = delay.add(delay.mul(new Decimal(Math.random()).mul(0.3)))
                // sleep for the delay
                await sleep(delay.toNumber())
                // connect to the server
                await connect()
                // set retries to 0
                retries = 0
            }

            // handle the abort signal
            signal?.addEventListener("abort", async () => {
                if (aborted) return
                aborted = true
                // call the onFatal callback
                await onFatal?.()
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