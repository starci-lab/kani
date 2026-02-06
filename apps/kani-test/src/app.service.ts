import {
    Injectable, OnModuleInit 
} from "@nestjs/common"
import {
    generateP256KeyPair 
} from "@privy-io/node"
@Injectable()
export class AppService implements OnModuleInit { 
    constructor() {}

    async onModuleInit() {
        
    }

    async createAsyncIterator<TData>(
        // define the connection
        connection: StreamConnection<TData>,
        // define the abort signal
        signal?: AbortSignal
    ): Promise<AsyncIterable<TData>> {
        // return the async iterable
        return {
            // define the async iterator
            async *[Symbol.asyncIterator](): AsyncIterator<TData> {
                // initialize the queue
                const queue: Array<TData> = []
                // initialize the resolve, closed, and error
                let resolve: (() => void) | null = null
                let closed = false
                let error: Error | undefined = undefined
                // define the wakeup function
                const wakeup = () => {
                    resolve?.()
                    resolve = null
                }
                // define the abort error function
                const abortError = () => new WsConnectionAbortedException("WS connection aborted")
                // define the onAbort handler
                const onAbort = () => {
                    closed = true
                    error = abortError()
                    wakeup()
                }
                // check if the signal is aborted
                if (signal) {
                    // if the signal is aborted then call the onAbort function
                    if (signal.aborted) {
                        onAbort()
                    } else {
                        // add the abort event listener to the signal
                        signal.addEventListener("abort",
                            onAbort)
                    }
                }
                // define the onData handler
                connection.onData(
                    (data) => {
                        // if the connection is closed then return
                        if (closed) return
                        // push the data into the queue
                        queue.push(data)
                        // wake up the loop
                        wakeup()
                    }
                )
                // define the onError handler
                connection.onError((err) => {
                    // store the error
                    error = err
                    // mark the connection as closed
                    closed = true
                    // wake up the loop
                    wakeup()
                })
                // define the onClose handler
                connection.onClose(() => {
                    // mark the connection as closed
                    closed = true
                    // wake up the loop
                    wakeup()
                })
                try {
                    // loop until the connection is closed
                    while (true) {
                        // if there is data in the queue
                        if (queue.length) {
                            // yield the first element of the queue
                            yield queue.shift()!
                            continue
                        }
                        // if the connection is closed
                        if (closed) {
                            // if there is an error then throw it
                            if (error) throw error
                            return
                        }
                        // wait for the next message
                        await new Promise<void>(
                            (res) => {
                            // store the resolve function
                                resolve = res
                            }
                        )
                    }
                } finally {
                    // remove the abort event listener from the signal
                    signal?.removeEventListener("abort",
                        onAbort)
                    // close the connection
                    connection.close()
                }
            }
        }
    }
}   

// create the stream connection interface
export interface StreamConnection<TData> {
    // define the onOpen handler
    onOpen(handler: () => void): void
    // define the onData handler
    onData(handler: (data: TData) => void | Promise<void>): void
    // define the onError handler
    onError(handler: (error: Error) => void): void
    // define the onClose handler
    onClose(handler: () => void): void
    // define the close function
    close(): void
}