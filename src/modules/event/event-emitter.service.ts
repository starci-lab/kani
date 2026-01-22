import {
    Inject, Injectable, OnModuleInit 
} from "@nestjs/common"
import {
    EventEmitter2 
} from "@nestjs/event-emitter"
import {
    InjectSuperJson, InstanceIdService 
} from "@modules/mixin"
import {
    CompressionTypes 
} from "kafkajs"
import SuperJSON from "superjson"
import {
    MODULE_OPTIONS_TOKEN, OPTIONS_TYPE 
} from "./event.module-definition"
import {
    KafkaProducerService 
} from "./kafka"
import {
    ModuleRef 
} from "@nestjs/core"
import {
    EventName, configMap 
} from "./config"
import {
    createHash 
} from "@modules/utils"

export interface EmitOptions {
    useKafka?: boolean
    useLocal?: boolean
}

@Injectable()
export class EventEmitterService implements OnModuleInit {
    private kafkaProducerService: KafkaProducerService
    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        private readonly eventEmitter: EventEmitter2,
        private readonly instanceIdService: InstanceIdService,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly moduleRef: ModuleRef,
    ) {}
    
    async onModuleInit() {
        if (
            this.isKafkaProducerEnabled()
        ) {
            this.kafkaProducerService = await this.moduleRef.get(
                KafkaProducerService, 
                {
                    strict: false 
                }
            )
        }
    }

    private isKafkaProducerEnabled(): boolean {
        return (
            this.options.kafka?.usePublish ?? false
        )
    }

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
        if (args) {
            event = createHash(
                event,
                ...args
            ) as T
        }
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
                event,
                payload
            )
        }
      
        // Emit to Kafka (cross-instance / distributed)
        if (
            useKafka &&
          this.isKafkaProducerEnabled() &&
          this.kafkaProducerService
        ) {
            await this.kafkaProducerService.producer.send({
                topic: event,
                compression: CompressionTypes.GZIP,
                acks: 1,
                messages: [
                    {
                        value: this.superjson.stringify({
                            data: payload,
                            instanceId: this.instanceIdService.getId(),
                        }),
                    },
                ],
            })
        }
    }

    on<T extends EventName>(
        {
            event,
            args,
            listener,
        }: OnParams<T>
    ) {
        if (args) {
            event = createHash(
                event,
                ...args
            ) as T
        }
        this.eventEmitter.on(
            event,
            listener
        )
    }

    off<T extends EventName>(
        {
            event,
            args,
            listener,
        }: OffParams<T>
    ) {
        if (args) {
            event = createHash(
                event,
                ...args
            ) as T
        }
        this.eventEmitter.off(event,
            listener)
    }
}

export interface EmitParams<T extends EventName> {
    event: T
    args?: Array<unknown>
    payload: typeof configMap[T]["eventPayload"]
    options?: EmitOptions
}

export interface OnParams<T extends EventName> {
    event: T
    args?: Array<unknown>
    listener: (payload: typeof configMap[T]["eventPayload"]) => void
}

export interface OffParams<T extends EventName> {
    event: T
    args?: Array<unknown>
    listener: (payload: typeof configMap[T]["eventPayload"]) => void
}