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

/** Internal shape of the transformed GraphQL response (data, message, success, error). */
interface GraphQLResponse<T = unknown> {
    data?: T
    message: string
    success: boolean
    error?: string
}

const SUCCESS_MESSAGE_METADATA = "graphqlSuccessMessage"

/** Sets the success message for the next resolver/handler. */
export const GraphQLSuccessMessage = (message: string) =>
    SetMetadata(SUCCESS_MESSAGE_METADATA,
        message)

/**
 * Interceptor that wraps resolver result in { data, message, success } and handles errors.
 *
 * @example
 * Use @GraphQLSuccessMessage("Done") on a resolver; this interceptor adds it to the response.
 */
@Injectable()
export class GraphQLTransformInterceptor<T = unknown>
implements NestInterceptor<T, GraphQLResponse<T>> {
    constructor(private readonly reflector: Reflector) {}

    intercept(
        context: ExecutionContext,
        next: CallHandler<T>,
    ): Observable<GraphQLResponse<T>> {
        // get custom message from metadata (resolver or class)
        const message =
            this.reflector.get<string>(SUCCESS_MESSAGE_METADATA,
                context.getHandler()) ??
            this.reflector.get<string>(SUCCESS_MESSAGE_METADATA,
                context.getClass())
        return next.handle().pipe(
            map((data): GraphQLResponse<T> => ({
                data,
                message,
                success: true,
            })),
            catchError((err) => {
                return new Observable<GraphQLResponse<T>>((observer) => {
                    observer.next({
                        success: false,
                        message: err.message,
                        error: err.name,
                    })
                    observer.complete()
                })
            }),
        )
    }
}
