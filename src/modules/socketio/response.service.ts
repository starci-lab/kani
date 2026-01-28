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
        }: Omit<WsResponseParams<T>, "success">,
    ): void {
        client.emit(
            eventName,
            {
                success: true,
                message,
                data: this.superJson.stringify(data),
            },
        )
    }

    error(
        { 
            client, 
            error,
            eventName 
        }: Omit<WsResponseParams<string>, "success">,
    ): void {
        client.emit(
            eventName,
            {
                success: false,
                message: error?.message ?? "Unknown error",
                error: error?.name ?? "Unknown error",
            },
        )
    }
}

export interface WsResponseParams<T = unknown> {
    message: string
    data?: T
    client: TypedSocket
    eventName: string
    success: boolean
    error?: AbstractException
}