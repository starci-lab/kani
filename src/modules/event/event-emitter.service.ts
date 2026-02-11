import {
    Injectable 
} from "@nestjs/common"
import {
    EventEmitter2 
} from "@nestjs/event-emitter"
import {
    CompressionTypes 
} from "kafkajs"
import {
    configMap,
} from "./config"
import {
    EventName,
} from "./enums"
import {
    KafkaMessageFactoryService, KafkaProducerService 
} from "./kafka"
import {
    getEventName 
} from "./utils"

export interface EmitOptions {
    useKafka?: boolean
    useLocal?: boolean
}

@Injectable()
export class EventEmitterService {
    constructor(
        private readonly kafkaProducerService: KafkaProducerService,
        private readonly kafkaMessageFactoryService: KafkaMessageFactoryService,
        private readonly eventEmitter: EventEmitter2,
    ) {}
    

    /**
     * Emit an event.
     */
    async emit<T extends EventName>(
        {
            event,
            args,
            payload,
            options = {
            },
        }: EmitParams<T>
    ) {
        const config = configMap[event]
        const eventName = getEventName(
            event,
            args
        )
        // if useLocal is not provided, use the config value
        const useLocal =
          options?.useLocal !== undefined
              ? options?.useLocal
              : config?.useLocal
        // if useKafka is not provided, use the config value
        const useKafka =
          options?.useKafka !== undefined
              ? options?.useKafka
              : config?.useKafka
      
        // Emit locally (in-process listeners)
        if (useLocal) {
            this.eventEmitter.emit(
                eventName,
                payload
            )
        }
      
        // Emit to Kafka (cross-instance / distributed)
        if (
            useKafka
        ) {
            await this.kafkaProducerService.producer.send({
                topic: eventName,
                compression: CompressionTypes.GZIP,
                // ack = 0 means the producer will not wait for the leader to commit the message to the partition
                acks: 0,
                messages: [
                    {
                        value: this.kafkaMessageFactoryService.create(
                            payload
                        ),
                    },
                ],
            })
        }
    }

    /**
     * On an event.
     */
    on<T extends EventName>(
        {
            event,
            args,
            listener,
        }: OnParams<T>
    ) {
        const eventName = getEventName(
            event,
            args
        )
        this.eventEmitter.on(
            eventName,
            listener
        )
    }

    /**
     * Off an event.
     */
    off<T extends EventName>(
        {
            event,
            args,
            listener,
        }: OffParams<T>
    ) {
        const eventName = getEventName(
            event,
            args
        )
        this.eventEmitter.off(
            eventName,
            listener
        )
    }
}

/**
 * Emit parameters.
 */
export interface EmitParams<T extends EventName> {
    event: T
    args?: Array<unknown>
    payload: typeof configMap[T]["eventPayload"]
    options?: EmitOptions
}

/**
 * On parameters.
 */
export interface OnParams<T extends EventName> {
    event: T
    args?: Array<unknown>
    listener: (payload: typeof configMap[T]["eventPayload"]) => void
}

/**
 * Off parameters.
 */
export interface OffParams<T extends EventName> {
    event: T
    args?: Array<unknown>
    listener: (payload: typeof configMap[T]["eventPayload"]) => void
}