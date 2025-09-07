import { Inject, Injectable } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } from "./event.module-definition"
import { EventType } from "./types"
import { EventName } from "./events"
import { KAFKA_PRODUCER } from "./kafka/kafka.constants"
import { ModuleRef } from "@nestjs/core"
import { InstanceIdService } from "@modules/mixin"

@Injectable()
export class EventEmitterService {
    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        private readonly moduleRef: ModuleRef,
        private readonly eventEmitter: EventEmitter2,
        private readonly instanceIdService: InstanceIdService
    ) {}

    emit<T>(
        event: EventName, payload: T
    ) {
        const types = this.options.types 
        // emit locally via event emitter
        if (!types || types.includes(EventType.Internal)) {
            this.eventEmitter.emit(event, payload)
        }
        // emit external via kafka
        if (!types || types.includes(EventType.Kafka)) {
            const kafkaProducer = this.moduleRef.get(KAFKA_PRODUCER, {
                strict: false
            })
            kafkaProducer.send({
                topic: event,
                messages: [{ value: JSON.stringify({
                    ...payload,
                    instanceId: this.instanceIdService.getId()
                }) }]
            })
        }
    }
}