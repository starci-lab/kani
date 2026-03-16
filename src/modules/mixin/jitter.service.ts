import {
    Injectable
} from "@nestjs/common"

/**
 * Options for adding jitter to a delay.
 */
export interface JitterOptions {
    /**
     * Fraction of the delay to use as max jitter (0–1). Default 1 (full jitter).
     * E.g. 0.5 => result in [delay * 0.5, delay * 1.5].
     */
    factor?: number
}

/**
 * Service for adding random jitter to delays (e.g. to avoid thundering herd).
 */
@Injectable()
export class JitterService {
    /**
     * Returns baseDelay + random jitter.
     * By default uses full jitter: result in [baseDelayMs, baseDelayMs * 2].
     *
     * @param baseDelayMs - Base delay in milliseconds.
     * @param options.factor - Jitter factor (default 1). Result in [baseDelayMs, baseDelayMs * (1 + factor)].
     * @returns Delay in milliseconds with jitter.
     */
    addJitter(
        baseDelayMs: number, 
        options?: JitterOptions
    ): number {
        const factor = options?.factor ?? 1
        const jitter = Math.random() * factor * baseDelayMs
        return Math.round(jitter)
    }

    /**
     * Sleep for baseDelayMs with random jitter, then resolve.
     *
     * @param baseDelayMs - Base delay in milliseconds.
     * @param options - Optional jitter options.
     */
    async delayWithJitter(
        baseDelayMs: number,
        options?: JitterOptions,
    ): Promise<void> {
        const delayMs = this.addJitter(
            baseDelayMs,
            options)
        return new Promise(
            (resolve) => setTimeout(
                resolve,
                delayMs
            )
        )
    }
}
