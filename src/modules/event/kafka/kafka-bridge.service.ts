import {
    Injectable, 
    OnApplicationBootstrap, 
    OnModuleInit, 
    OnApplicationShutdown 
} from "@nestjs/common"
import {
    EventEmitter2 
} from "@nestjs/event-emitter"
import {
    EachMessagePayload 
} from "kafkajs"
import { 
    InjectSuperJson, 
    InstanceIdService
} from "@modules/mixin"
import SuperJSON from "superjson"
import {
    KafkaConsumerService 
} from "./consumer.service"
import {
    WinstonLog 
} from "@modules/winston"
import {
    WinstonService 
} from "@modules/winston"
import {
    MODULE_OPTIONS_TOKEN, OPTIONS_TYPE 
} from "./kafka.module-definition"
import {
    Inject 
} from "@nestjs/common"
import _ from "lodash"
import {
    configMap 
} from "../config"
import {
    EventPayloadType 
} from "../types"

@Injectable()
export class KafkaBridgeService implements OnApplicationBootstrap, OnModuleInit, OnApplicationShutdown {
    private topics: Array<string> = []
    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        private readonly kafkaConsumerService: KafkaConsumerService,
        private readonly eventEmitter: EventEmitter2,
        private readonly instanceIdService: InstanceIdService,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly winstonService: WinstonService
    ) {}

    onApplicationBootstrap() {
        // bridge all kafka events
        this.bridgeAllKafkaEvents()
    }   

    onModuleInit() {
        // get all events with kafka metadata and get the topics
        const topics = Object.entries(configMap).filter(
            ([, metadata]) => metadata.useKafka
        ).map(([eventName]) => eventName)
        // if user provided topics, use the shared topics
        if (this.options.topics) {
            this.topics = _.intersection(topics,
                this.options.topics
            )
        } else {
            this.topics = topics
        }
    }

    async bridgeAllKafkaEvents(): Promise<void> {
        // get all events with kafka metadata and get the topics
        await this.kafkaConsumerService.consumer.subscribe({
            topics: this.topics,
            fromBeginning: false,   
        })    
        this.winstonService.log(
            WinstonLog.KafkaConsumerTopicsSubscribed,
            {
                topics: this.topics
            }
        )
        await this.kafkaConsumerService.consumer.run({
            eachMessage: async (
                payload: EachMessagePayload
            ) => {
                const { topic, message } = payload
                const value = message.value?.toString() || "{}"
                const data = this.superjson.parse(value) as EventPayloadType<unknown>
                if (data.instanceId === this.instanceIdService.getId()) {
                    return
                }
                this.eventEmitter.emit(
                    topic,
                    data.data
                )
            }
        })
    }
  
    onApplicationShutdown() {
        this.kafkaConsumerService.consumer.disconnect()
    }
}


