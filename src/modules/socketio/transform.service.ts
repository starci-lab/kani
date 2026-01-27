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
export class WsTransformService {
    constructor(
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
    ) {}

    transformSuccess<T = unknown>(
        { 
            message, 
            data, 
            client, 
            eventName 
        }: TransformSuccessParams<T>): void {
        client.emit(
            eventName,
            {
                success: true,
                message,
                data: this.superJson.serialize(data),
            },
        )
    }

    transformError(
        { 
            client, 
            error,
            eventName 
        }: TransformErrorParams): void {
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

export interface TransformSuccessParams<T = unknown> {
    message: string
    data: T
    client: TypedSocket
    eventName: string
}

export interface TransformErrorParams {
    client: TypedSocket
    eventName: string
    error: AbstractException
}