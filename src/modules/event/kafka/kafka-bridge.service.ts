import { Injectable, OnApplicationBootstrap, OnModuleInit, OnApplicationShutdown } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { EachMessagePayload } from "kafkajs"
import { 
    InjectSuperJson, 
    InstanceIdService, 
    DayjsService
} from "@modules/mixin"
import { EventPayloadType } from "../types"
import SuperJSON from "superjson"
import { KafkaConsumerService } from "./consumer.service"
import { eventMetadataMap } from "../map"
import { WinstonLog } from "@modules/winston"
import { InjectWinston } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } from "./kafka.module-definition"
import { Inject } from "@nestjs/common"
import _ from "lodash"

@Injectable()
export class KafkaBridgeService implements OnApplicationBootstrap, OnModuleInit, OnApplicationShutdown {
    private topics: Array<string> = []
    private topicReceivedMessage: Record<string, boolean> = {}
    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        private readonly kafkaConsumerService: KafkaConsumerService,
        private readonly eventEmitter: EventEmitter2,
        private readonly instanceIdService: InstanceIdService,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        @InjectWinston()
        private readonly logger: WinstonLogger,
        private readonly dayjsService: DayjsService,
    ) {}

    onApplicationBootstrap() {
        // bridge all kafka events
        this.bridgeAllKafkaEvents()
    }   

    onModuleInit() {
        // get all events with kafka metadata and get the topics
        const allTopics = Object.entries(eventMetadataMap).filter(
            ([, metadata]) => metadata.kafka
        ).map(([eventName]) => eventName)
        // if user provided topics, use the shared topics
        if (this.options.kafkaTopics) {
            this.topics = _.intersection(allTopics, this.options.kafkaTopics)
        } else {
            this.topics = allTopics
        }
    }

    async bridgeAllKafkaEvents(): Promise<void> {
        // get all events with kafka metadata and get the topics
        await this.kafkaConsumerService.consumer.subscribe({
            topics: this.topics,
            fromBeginning: false,   
        })    
        this.logger.info(
            WinstonLog.KafkaConsumerTopicsSubscribed, {
                topics: this.topics,
                instanceId: this.instanceIdService.getId(),
            })
        await this.kafkaConsumerService.consumer.run({
            eachMessage: async (
                payload: EachMessagePayload
            ) => {
                const { topic, message } = payload
                const value = message.value?.toString() || "{}"
                const data = this.superjson.parse(value) as EventPayloadType<unknown>
                if (data.instanceId === this.instanceIdService.getId()) {
                    this.logger.debug(`Received event ${topic} from this instance`)
                    return
                }
                if (!this.topicReceivedMessage[topic]) {
                    this.topicReceivedMessage[topic] = true
                    this.logger.verbose(
                        WinstonLog.KafkaConsumerTopicListened, {
                            topic,
                            timestamp: this.dayjsService.now().toISOString(),
                            listenedCount: Object.keys(this.topicReceivedMessage).length,
                            totalTopics: this.topics.length,
                        }
                    )
                }
                this.eventEmitter.emit(topic, data.data)
            }
        })
        this.logger.debug(`Listening to ${this.topics.length} topics`)
    }
  
    onApplicationShutdown() {
        console.log("onApplicationShutdown", this.topics)
        this.kafkaConsumerService.consumer.disconnect()
    }
}


