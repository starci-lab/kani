import { Injectable } from "@nestjs/common"
import { TimeoutException } from "@exceptions"
import { envConfig } from "@modules/env"

@Injectable()
export class TimeoutService {
    async withTimeout<T>(
        callback: (throwIfAborted: () => void) => Promise<T>,
        timeout: number
    ): Promise<T> {
        const signal = AbortSignal.timeout(timeout)
        try {
            const result = await callback(() => this.throwIfAborted(signal))
            if (signal.aborted) {
                throw new TimeoutException(`Timeout after ${timeout}ms`)
            }
            return result
        } catch (err) {
            if (signal.aborted) {
                throw new TimeoutException(`Timeout after ${timeout}ms`)
            }
            throw err
        }
    }

    async throwIfAborted(signal: AbortSignal) {
        if (signal.aborted) {
            throw new TimeoutException(`Timeout after ${envConfig().bullmq.timeout}ms`)
        }
    }
}