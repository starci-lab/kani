import { CallHandler, ExecutionContext, Injectable, NestInterceptor, SetMetadata } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { Observable } from "rxjs"
import { map, catchError } from "rxjs/operators"

interface GraphQLResponse<T = unknown> {
  data?: T
  message: string
  success: boolean
  error?: string
}

export const SUCCESS_MESSAGE_METADATA = "successMessage"

export const GraphQLSuccessMessage = (message: string) => SetMetadata(SUCCESS_MESSAGE_METADATA, message)

@Injectable()
export class GraphQLTransformInterceptor<T = unknown>
implements NestInterceptor<T, GraphQLResponse<T>>
{
    constructor(private readonly reflector: Reflector) {}

    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<GraphQLResponse<T>> {
        // Get custom message from metadata (resolver/handler level)
        const message =
      this.reflector.get<string>(SUCCESS_MESSAGE_METADATA, context.getHandler()) ??
      this.reflector.get<string>(SUCCESS_MESSAGE_METADATA, context.getClass())
        return next.handle().pipe(
            map((data): GraphQLResponse<T> => {
                return {
                    data,
                    message,
                    success: true,
                }
            }),
            catchError((err) => {
                return new Observable<GraphQLResponse<T>>((observer) => {
                    console.log("err", err)
                    console.log("err.message", err.message)
                    console.log("err.name", err.name)
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