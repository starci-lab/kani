import { Injectable } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { EventName } from "./events"
import { InjectSuperJson, InstanceIdService } from "@modules/mixin"
import { InjectKafkaProducer } from "./kafka/kafka.decorators"
import { CompressionTypes, Producer } from "kafkajs"
import SuperJSON from "superjson"

export interface EmitOptions {
    withoutKafka?: boolean
    withoutLocal?: boolean
}

@Injectable()
export class EventEmitterService {
    constructor(
        @InjectKafkaProducer()
        private readonly kafkaProducer: Producer,
        private readonly eventEmitter: EventEmitter2,
        private readonly instanceIdService: InstanceIdService,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
    ) {}

    async emit<T>(
        event: EventName, payload: T, options?: EmitOptions
    ) {
        // emit locally via event emitter, ensure everything is working locally
        if (!options || !options.withoutLocal) {
            this.eventEmitter.emit(event, payload)
        }
        // emit via kafka, ensure other followers to receive the message
        if (!options || !options.withoutKafka) {
            return await this.kafkaProducer.send({
                topic: event,
                // compress the message to reduce the size of the message
                compression: CompressionTypes.GZIP,
                // ensure the message is persisted to the follower
                // ack = 1 means the message is acknowledged when the leader has written the message to its local log
                // ack = 0 means the message is acknowledged when the leader has received the message from the producer
                // ack = -1 means the message is acknowledged when the leader has written the message to its local log and the message is persisted to the follower
                acks: -1,
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