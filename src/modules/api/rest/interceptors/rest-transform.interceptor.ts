import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    SetMetadata,
} from "@nestjs/common"
import {
    Reflector,
} from "@nestjs/core"
import {
    Observable,
} from "rxjs"
import {
    map,
    catchError,
} from "rxjs/operators"
import {
    RestTransformResponseDto,
} from "../dtos/rest-transform"

/** Metadata key for custom success message per handler or controller. */
const SUCCESS_MESSAGE_METADATA = "restSuccessMessage"

/**
 * Sets the success message returned when the handler succeeds.
 * Use on controller method or class. Handler-level metadata overrides class-level.
 *
 * @param message - Message to return in the response (e.g. "Job created successfully").
 *
 * @example
 * @RestSuccessMessage("Withdraw job queued")
 * @Post("withdraw")
 * async createWithdraw() { ... }
 */
export const RestSuccessMessage = (message: string) =>
    SetMetadata(SUCCESS_MESSAGE_METADATA,
        message)

/**
 * Interceptor that wraps all controller responses in a consistent shape:
 * { success, message, data?, error? }.
 * Use with RestSuccessMessage to set the message; on error, success=false and error set.
 */
@Injectable()
export class RestTransformInterceptor<T = unknown>
implements NestInterceptor<T, RestTransformResponseDto<T>>
{
    constructor(private readonly reflector: Reflector) {}

    intercept(
        context: ExecutionContext,
        next: CallHandler<T>,
    ): Observable<RestTransformResponseDto<T>> {
        // get custom message from metadata (handler-level overrides class-level)
        const message =
            this.reflector.get<string>(SUCCESS_MESSAGE_METADATA,
                context.getHandler()) ??
            this.reflector.get<string>(SUCCESS_MESSAGE_METADATA,
                context.getClass())

        // transform successful responses to consistent shape
        return next.handle().pipe(
            map(
                (data): RestTransformResponseDto<T> => ({
                    data,
                    message: message ?? "",
                    success: true,
                }),
            ),
            // handle errors and wrap in consistent error shape
            catchError((err) => {
                return new Observable<RestTransformResponseDto<T>>((observer) => {
                    observer.next({
                        success: false,
                        message: err?.message ?? "Unknown error",
                        error: err?.name ?? "Error",
                    })
                    observer.complete()
                })
            }),
        )
    }
}
