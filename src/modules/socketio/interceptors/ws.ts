import {
    SUCCESS_MESSAGE_METADATA 
} from "../decorators"
import {
    InjectSuperJson 
} from "@modules/mixin"
import {
    TypedSocket 
} from "@modules/socketio"
import {
    Injectable, 
    NestInterceptor, 
    ExecutionContext, 
    CallHandler 
} from "@nestjs/common"
import {
    Reflector 
} from "@nestjs/core"
import {
    Observable, map, catchError 
} from "rxjs"
import SuperJSON from "superjson"
import {
    MESSAGE_METADATA 
} from "@nestjs/websockets/constants"

@Injectable()
export class WsTransformInterceptor<T = unknown>
implements NestInterceptor<T, void>
{
    constructor(
    private readonly reflector: Reflector,
    @InjectSuperJson()
    private readonly superJson: SuperJSON,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<void> {
        const client = context.switchToWs().getClient<TypedSocket>()
 
        const message =
      this.reflector.get<string>(
          SUCCESS_MESSAGE_METADATA,
          context.getHandler()) ??
      this.reflector.get<string>(
          SUCCESS_MESSAGE_METADATA,
          context.getClass())
        const eventName = this.reflector.get<string>(
            MESSAGE_METADATA,
            context.getHandler())
        return next.handle().pipe(
            map((data) => {
                client.emit(
                    eventName,
                    {
                        success: true,
                        message,
                        data: this.superJson.serialize(data),
                    },
                    
                )
            }),
            catchError((err) => {
                return new Observable<void>((observer) => {
                    client.emit(
                        eventName,
                        {
                            success: false,
                            message: err.message,
                            error: err.name,
                        },
                    )
                    observer.complete()
                })
            }),
        )
    }
}
