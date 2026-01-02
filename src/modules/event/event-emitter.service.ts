import { Inject, Injectable, OnModuleInit } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { EventName } from "./events"
import { InjectSuperJson, InstanceIdService } from "@modules/mixin"
import { CompressionTypes } from "kafkajs"
import SuperJSON from "superjson"
import { eventMetadataMap } from "./map"
import { MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } from "./event.module-definition"
import { KafkaMode, KafkaProducerService } from "./kafka"
import { ModuleRef } from "@nestjs/core"

export interface EmitOptions {
    withoutKafka?: boolean
    withoutLocal?: boolean
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
                { strict: false }
            )
        }
    }

    private isKafkaProducerEnabled(): boolean {
        return (
            this.options.kafka?.modes?.includes(KafkaMode.Producer) ?? false
        )
    }

    async emit<T>(
        event: EventName, 
        payload: T, 
        emitOptions?: EmitOptions
    ) {
        // emit locally via event emitter, ensure everything is working locally
        if (!emitOptions || !emitOptions.withoutLocal) {
            this.eventEmitter.emit(event, payload)
        }
        // emit via kafka, ensure other followers to receive the message
        if ((!emitOptions || !emitOptions.withoutKafka) && this.isKafkaProducerEnabled()) {
            // if the event does not have kafka metadata, return
            if (!eventMetadataMap[event].kafka) {
                return
            }
            // send the message to the kafka topic
            return await this.kafkaProducerService.producer.send({
                topic: event,
                // compress the message to reduce the size of the message
                compression: CompressionTypes.GZIP,
                // ensure the message is persisted to the follower
                // ack = 1 means the message is acknowledged when the leader has written the message to its local log
                // ack = 0 means the message is acknowledged when the leader has received the message from the producer
                // ack = -1 means the message is acknowledged when the leader has written the message to its local log and the message is persisted to the follower
                acks: 1,
                messages: [
                    { 
                        value: this.superjson.stringify({
                            data: payload,
                            instanceId: this.instanceIdService.getId()
                        }) 
                    },
                ],
            })
        }
    }

    on<T>(
        event: EventName,
        listener: (payload: T) => void
    ) {
        this.eventEmitter.on(event, listener)
    }
}