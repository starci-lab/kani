import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { Consumer, EachMessagePayload } from "kafkajs"
import { EventName } from "../events"
import { InjectKafkaConsumer } from "./kafka.decorators"
import { InjectSuperJson, InstanceIdService } from "@modules/mixin"
import { EventPayloadType } from "../types"
import SuperJSON from "superjson"

@Injectable()
export class KafkaBridgeService implements OnModuleInit, OnApplicationShutdown {
    private readonly logger = new Logger(KafkaBridgeService.name)
    constructor(
        @InjectKafkaConsumer()
        private readonly consumer: Consumer,
        private readonly eventEmitter: EventEmitter2,
        private readonly instanceIdService: InstanceIdService,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
    ) {}

    async onModuleInit() {
        await this.bridgeAllKafkaEvents()
    }

    async bridgeAllKafkaEvents(): Promise<void> {
        const topics = Object.values(EventName)
        await this.consumer.subscribe({
            topics,
            fromBeginning: false,
        })    
        await this.consumer.run({
            eachMessage: async (payload: EachMessagePayload) => {
                const { topic, message } = payload
                const value = message.value?.toString() || "{}"
                const data = this.superjson.parse(value) as EventPayloadType<unknown>
                if (data.instanceId === this.instanceIdService.getId()) {
                    this.logger.debug(`Received event ${topic} from this instance`)
                    return
                }
                this.eventEmitter.emit(topic, data.data)
            },
        })
        this.logger.debug(`Listening to ${topics.length} topics`)
    }

    async onApplicationShutdown(): Promise<void> {
        await this.consumer.disconnect()
    }
}


