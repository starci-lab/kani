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
    ApiPropertyOptional,
} from "@nestjs/swagger"
import {
    Observable,
} from "rxjs"
import {
    map,
    catchError,
} from "rxjs/operators"

/**
 * Response shape returned by ApiTransformInterceptor.
 * Documented for Swagger so all controller responses show success/message/data/error.
 */
export class RestTransformResponseDto<T = unknown> {
    @ApiPropertyOptional({
        description: "Response payload when the request succeeded.",
        example: {
            id: "123", status: "created" 
        },
    })
        data?: T

    @ApiPropertyOptional({
        description: "Success or status message.",
        example: "Resource created successfully",
    })
        message?: string

    @ApiPropertyOptional({
        description: "True when the request succeeded, false on exception.",
        example: true,
    })
        success?: boolean

    @ApiPropertyOptional({
        description: "Error name or code when success is false.",
        example: "ValidationError",
    })
        error?: string
}

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
        const message =
            this.reflector.get<string>(SUCCESS_MESSAGE_METADATA,
                context.getHandler()) ??
            this.reflector.get<string>(SUCCESS_MESSAGE_METADATA,
                context.getClass())

        return next.handle().pipe(
            map(
                (data): RestTransformResponseDto<T> => ({
                    data,
                    message: message ?? "",
                    success: true,
                }),
            ),
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
