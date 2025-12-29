import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { EachMessagePayload } from "kafkajs"
import { 
    InjectSuperJson, 
    InstanceIdService, 
    ReadinessWatcherFactoryService 
} from "@modules/mixin"
import { EventPayloadType } from "../types"
import SuperJSON from "superjson"
import { KafkaConsumerService } from "./consumer.service"
import { eventMetadataMap } from "../map"

@Injectable()
export class KafkaBridgeService implements OnModuleInit {
    private readonly logger = new Logger(KafkaBridgeService.name)
    constructor(
        private readonly kafkaConsumerService: KafkaConsumerService,
        private readonly eventEmitter: EventEmitter2,
        private readonly instanceIdService: InstanceIdService,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) {}

    async onModuleInit() {
        // wait for the consumer to be ready
        await this.readinessWatcherFactoryService.waitUntilReady(KafkaConsumerService.name)
        // bridge all kafka events
        await this.bridgeAllKafkaEvents()
    }   

    async bridgeAllKafkaEvents(): Promise<void> {
        // get all events with kafka metadata and get the topics
        const topics = Object.entries(eventMetadataMap).filter(
            ([, metadata]) => metadata.kafka
        ).map(([eventName]) => eventName)
        if (!topics.length) {
            return
        }
        await this.kafkaConsumerService.consumer.subscribe({
            topics,
            fromBeginning: false,
        })    
        await this.kafkaConsumerService.consumer.run({
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
}


