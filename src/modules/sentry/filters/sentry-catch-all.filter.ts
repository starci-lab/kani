import {
    Catch, ExceptionFilter 
} from "@nestjs/common"
import {
    SentryExceptionCaptured 
} from "@sentry/nestjs"

/**
 * The Sentry catch all exception filter.
 */
@Catch()
export class SentryCatchAllExceptionFilter implements ExceptionFilter {
    /**
     * Catch all exceptions and capture them with Sentry.
     * @param exception - The exception to capture.
     * @returns void.
     */
    @SentryExceptionCaptured()
    catch (): void {
        // your implementation here
    }
}