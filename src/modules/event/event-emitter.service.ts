import { Inject, Injectable } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } from "./event.module-definition"
import { EventName } from "./events"
import { InstanceIdService } from "@modules/mixin"
import { InjectKafkaProducer } from "./kafka/kafka.decorators"
import { CompressionTypes, Producer } from "kafkajs"

@Injectable()
export class EventEmitterService {
    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        @InjectKafkaProducer()
        private readonly kafkaProducer: Producer,
        private readonly eventEmitter: EventEmitter2,
        private readonly instanceIdService: InstanceIdService,
    ) {}

    async emit<T>(
        event: EventName, payload: T
    ) {
        // emit locally via event emitter, ensure everything is working locally
        this.eventEmitter.emit(event, payload)
        // emit via kafka, ensure other followers to receive the message
        return await this.kafkaProducer.send({
            topic: event,
            // compress the message to reduce the size of the message
            compression: CompressionTypes.GZIP,
            // ensure the message is persisted to the follower
            // ack = 1 means the message is acknowledged when the leader has written the message to its local log
            // ack = 0 means the message is acknowledged when the leader has received the message from the producer
            // ack = -1 means the message is acknowledged when the leader has written the message to its local log and the message is persisted to the follower
            acks: -1,
            messages: [{ value: JSON.stringify({
                ...payload,
                instanceId: this.instanceIdService.getId()
            }) }]
        })
    }
}