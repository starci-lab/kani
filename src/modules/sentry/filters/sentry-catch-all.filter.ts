import { Catch, ExceptionFilter } from "@nestjs/common"
import { SentryExceptionCaptured } from "@sentry/nestjs"

@Catch()
export class SentryCatchAllExceptionFilter implements ExceptionFilter {
    // sentry will capture the exception
    @SentryExceptionCaptured()
    catch (): void {
        // your implementation here
    }
}