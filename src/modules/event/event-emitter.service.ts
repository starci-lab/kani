import {
    Injectable 
} from "@nestjs/common"
import {
    EventEmitter2 
} from "@nestjs/event-emitter"
import {
    configMap 
} from "./config"
import {
    EventName 
} from "./enums"
import {
    getEventName 
} from "./utils"
import {
    NatsMessageFactoryService, NatsProducerService 
} from "./nats"

export interface EmitOptions {
    useNats?: boolean
    useLocal?: boolean
}

@Injectable()
export class EventEmitterService {
    constructor(
        private readonly natsProducerService: NatsProducerService,
        private readonly natsMessageFactoryService: NatsMessageFactoryService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    /**
     * Emit an event.
     */
    async emit<T extends EventName>({
        event,
        args,
        payload,
        options = {
        },
    }: EmitParams<T>): Promise<void> {
        const config = configMap[event]
        const eventName = getEventName(event,
            args)

        const useLocal =
            options?.useLocal !== undefined
                ? options.useLocal
                : config?.useLocal
        const useNats =
            options?.useNats !== undefined
                ? options.useNats
                : config?.useNats

        if (useLocal) {
            this.eventEmitter.emit(eventName,
                payload)
        }

        if (useNats) {
            const serialized = this.natsMessageFactoryService.create({
                message: payload,
            })
            this.natsProducerService.publish({
                subject: eventName,
                payload: serialized,
            })
        }
    }

    /**
     * On an event.
     */
    on<T extends EventName>({ event, args, listener }: OnParams<T>): void {
        const eventName = getEventName(event,
            args)
        this.eventEmitter.on(eventName,
            listener)
    }

    /**
     * Off an event.
     */
    off<T extends EventName>({ event, args, listener }: OffParams<T>): void {
        const eventName = getEventName(event,
            args)
        this.eventEmitter.off(eventName,
            listener)
    }
}

/** Emit parameters. */
export interface EmitParams<T extends EventName> {
    event: T
    args?: Array<unknown>
    payload: (typeof configMap)[T]["eventPayload"]
    options?: EmitOptions
}

/** On parameters. */
export interface OnParams<T extends EventName> {
    event: T
    args?: Array<unknown>
    listener: (payload: (typeof configMap)[T]["eventPayload"]) => void
}

/** Off parameters. */
export interface OffParams<T extends EventName> {
    event: T
    args?: Array<unknown>
    listener: (payload: (typeof configMap)[T]["eventPayload"]) => void
}
