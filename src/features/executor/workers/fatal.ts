export const FATAL_ERROR = "bullmq:fatal"

/**
 * FatalError
 *
 * Error to mark a job as fatal. No retry will be attempted. Will require manual intervention.
 *
 */
export class FatalError extends Error {
    constructor(message: string = FATAL_ERROR) {
        super(message)
        this.name = this.constructor.name
        Object.setPrototypeOf(this,
            new.target.prototype)
    }
}