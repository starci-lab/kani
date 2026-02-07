import {
    Injectable
} from "@nestjs/common"
import {
    StreamConnectionAbortedException,
    StreamConnectionClosedException
} from "@modules/exceptions"
import type {
    CreateStreamParams,
} from "./types"

@Injectable()
export class StreamAsyncIteratorService {
    constructor() {}

    /**
     * Create an async iterable from a stream connection (with optional abort signal and handlers).
     */
    async createStream<TData>(
        params: CreateStreamParams<TData>,
    ): Promise<AsyncIterable<TData>> {
        const { connection, signal, onOpen, onError, onClose } = params
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
                const abortError = () => new StreamConnectionAbortedException({
                    reason: "Stream connection aborted",
                })
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
                // on open handler
                if (onOpen) {
                    await connection.onOpen(
                        async () => {
                            await onOpen(connection)
                        }
                    )
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
                connection.onError(
                    async (err) => {
                        if (onError) {
                            await onError(err)
                        }
                        // store the error
                        error = err
                        // mark the connection as closed
                        closed = true
                        // wake up the loop
                        wakeup()
                    }
                )
                // define the onClose handler
                connection.onClose(
                    async () => {
                        if (onClose) {
                            await onClose()
                        }
                        // mark the connection as closed
                        closed = true
                        // wake up the loop
                        wakeup()
                    }
                )
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
                            // throw the connection closed exception
                            throw new StreamConnectionClosedException({
                                originalError: new Error("Stream connection closed"),
                            })
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
