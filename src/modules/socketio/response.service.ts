import {
    InjectSuperJson 
} from "@modules/mixin"
import {
    Injectable 
} from "@nestjs/common"
import {
    SuperJSON 
} from "superjson"
import {
    TypedSocket 
} from "./types"
import {
    AbstractException 
} from "@exceptions"

@Injectable()
export class WsResponseService {
    constructor(
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
    ) {}

    success<T = unknown>(
        { 
            message, 
            data, 
            client, 
            eventName 
        }: WsSuccessResponseParams<T>,
    ): void {
        client.emit(
            eventName,
            {
                success: true,
                message,
                data: this.superJson.serialize(data),
            },
        )
    }

    error(
        { 
            client, 
            error,
            eventName 
        }: WsErrorResponseParams,
    ): void {
        client.emit(
            eventName,
            {
                success: false,
                message: error.message,
                error: error.name,
            },
        )
    }
}

export interface WsSuccessResponseParams<T = unknown> {
    message: string
    data: T
    client: TypedSocket
    eventName: string
}

export interface WsErrorResponseParams {
    client: TypedSocket
    eventName: string
    error: AbstractException
}
