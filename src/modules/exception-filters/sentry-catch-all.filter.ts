import {
    Catch, ExceptionFilter 
} from "@nestjs/common"
import {
    SentryExceptionCaptured 
} from "@sentry/nestjs"

@Catch()
export class SentryCatchAllExceptionFilter implements ExceptionFilter {
    @SentryExceptionCaptured()
    catch (): void {
        // do nothing
    }
}