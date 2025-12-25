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

    async retryWs<T extends { close(): void }>(
        {
            createConnection,
            onOpen,
            onError,
            options,
        }: WsRetryParams<T>
    ) {
        const {
            maxRetries = Infinity,
            baseDelay = 1000,
            maxDelay = 30_000,
            factor = 2,
            jitter = true,
            signal,
        } = options
    
        let retries = 0
        let conn: T | null = null
    
        const connect = async () => {
            if (signal?.aborted) return
    
            try {
                conn = await createConnection()
                onOpen(conn)
            } catch (err) {
                scheduleReconnect(err)
            }
        }
    
        const scheduleReconnect = (err?: unknown) => {
            if (signal?.aborted) return
    
            conn?.close()
            conn = null
    
            if (retries >= maxRetries) {
                this.logger.error("WS retry limit reached", { retries })
                return
            }
    
            retries++
    
            let delay =
                Math.min(
                    baseDelay * Math.pow(factor, retries),
                    maxDelay
                )
    
            if (jitter) {
                delay += delay * Math.random() * 0.3
            }
    
            this.logger.warn("WS reconnect scheduled", {
                retries,
                delay,
            })
    
            onError(err)
            setTimeout(connect, delay)
        }
    
        signal?.addEventListener("abort", () => {
            conn?.close()
            conn = null
        })
    
        connect()
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

export interface WsRetryParams<T extends { close(): void }> {
    createConnection: () => Promise<T> | T
    onOpen: (conn: T) => void
    onError: (err?: unknown) => void
    options: WsRetryOptions
}