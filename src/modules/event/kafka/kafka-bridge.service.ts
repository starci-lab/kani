import {
    Injectable,
    OnModuleInit,
    OnApplicationShutdown,
    Inject
} from "@nestjs/common"
import {
    EventEmitter2
} from "@nestjs/event-emitter"
import {
    KafkaConsumerService
} from "./consumer.service"
import {
    WinstonLog,
    WinstonService
} from "@modules/winston"
import {
    MODULE_OPTIONS_TOKEN, OPTIONS_TYPE
} from "./kafka.module-definition"
import _ from "lodash"
import {
    configMap
} from "../config"
import {
    KafkaConsumerStreamConnection,
    StreamAsyncIteratorService
} from "@modules/stream-async-iterator"
import {
    envConfig
} from "@modules/env"
import {
    Dayjs
} from "dayjs"
import {
    DayjsService
} from "@modules/mixin"
import {
    InstanceService 
} from "@modules/mixin"
import {
    RetryService,
    ReadinessWatcherFactoryService
} from "@modules/mixin"
import {
    KafkaMessageFactoryService
} from "./kafka-message-factory.service"
import {
    CacheKey,
    CacheService,
    CacheType
} from "@modules/cache"
import {
    EventName
} from "../enums"
import {
    InjectKafkaAdmin 
} from "./kafka.decorators"
import {
    Admin 
} from "kafkajs"
import {
    getEventName 
} from "../utils"

/**
     * Service that bridges Kafka messages to NestJS EventEmitter.
     *
     * Subscribes to Kafka topics and emits events to the local EventEmitter,
     * filtering out messages from the same instance to prevent loops.
     *
     * @example
     * const bridge = await app.get(KafkaBridgeService)
 */
@Injectable()
export class KafkaBridgeService
implements
    OnModuleInit,
    OnApplicationShutdown {
    private topics: Array<string> = []
    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        private readonly kafkaConsumerService: KafkaConsumerService,
        private readonly eventEmitter: EventEmitter2,
        private readonly winstonService: WinstonService,
        private readonly streamAsyncIteratorService: StreamAsyncIteratorService,
        private readonly dayjsService: DayjsService,
        private readonly retryService: RetryService,
        private readonly kafkaMessageFactoryService: KafkaMessageFactoryService,
        private readonly cacheService: CacheService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        private readonly instanceService: InstanceService,
        @InjectKafkaAdmin()
        private readonly kafkaAdmin: Admin,
    ) { }

    /**
     * Initializes topics list from config and options.
     *
     * Determines which topics to subscribe to based on:
     * - Events that have useKafka enabled in config
     * - Topics specified in module options (if any)
     */
    async onModuleInit(): Promise<void> {
        await this.readinessWatcherFactoryService.waitUntilReady(KafkaConsumerService.name)
        // get all events with kafka metadata and extract topic names
        const allKafkaTopics = Object.entries(configMap).filter(
            ([, metadata]) => metadata.useKafka
        ).map(([eventName]) => eventName)

        // if user provided topics, use intersection of config and provided topics
        this.topics = _.intersection(
            allKafkaTopics,
            _.uniq(
                [
                    ...(this.options.topics || []),
                    EventName.Ping
                ]
            )
        )
        // bridge all Kafka events to EventEmitter
        await this.bridgeAllKafkaEvents()
    }

    /**
     * Bridges all Kafka events to EventEmitter.
     *
     * Subscribes to configured topics and starts consuming messages,
     * emitting them to the local EventEmitter while filtering out
     * messages from the same instance.
     *
     * @returns Promise that resolves when subscription is set up
     */
    async bridgeAllKafkaEvents(): Promise<void> {
        this.retryService.retry(
            {
                options: {
                    retries: Infinity,
                },
                action: async () => {
                    // create the connection
                    const connection = new KafkaConsumerStreamConnection(
                        this.kafkaConsumerService.consumer,
                        this.topics
                    )
                    // create abort controller for connection management
                    const abortController = new AbortController()
                    // create timeout for connection idle detection
                    let timeout: NodeJS.Timeout | undefined = undefined
                    // reset timeout function to keep connection alive
                    const resetTimeout = () => {
                        if (timeout) {
                            clearTimeout(timeout)
                        }
                        timeout = setTimeout(
                            () => abortController.abort(),
                            envConfig().kafka.consumer.idleTimeout,
                        )
                    }
                    // create start time for duration calculation
                    let startTime: Dayjs | null = null
                    // create the stream
                    const stream = await this.streamAsyncIteratorService.createStream(
                        {
                            connection,
                            signal: abortController.signal,
                            onOpen: () => {
                            // log connection opened
                                this.winstonService.log(
                                    WinstonLog.KafkaConsumerOpened,
                                    {
                                        topics: this.topics
                                    }
                                )
                                startTime = this.dayjsService.now()
                            },
                            onClose: () => {
                            // log connection closed
                                this.winstonService.log(
                                    WinstonLog.KafkaConsumerClosed,
                                    {
                                        topics: this.topics,
                                        durationMs: startTime
                                            ? this.dayjsService.now().diff(
                                                startTime,
                                                "millisecond"
                                            )
                                            : null,
                                    }
                                )
                            },
                            onError: (error: Error) => {
                            // log error with info level
                                this.winstonService.log(
                                    WinstonLog.KafkaConsumerError,
                                    {
                                        topics: this.topics,
                                        error: error.message,
                                        stack: error.stack,
                                    }
                                )
                            },
                        }
                    )
                    // reset timeout when the stream is opened
                    resetTimeout()
                    // consume the stream
                    for await (const payload of stream) {
                        // get topic and message
                        const { topic, message } = payload
                        // parse message value
                        const value = message.value?.toString() || "{}"
                        const data = this.kafkaMessageFactoryService.parse(value)
                        // skip messages from same instance to prevent loops
                        if (data.id === this.instanceService.getId()) {
                            // if topic is ping, skip it
                            if (topic === EventName.Ping) {
                                resetTimeout()
                            }
                            continue
                        }
                        // we check the digest to prevent duplicate messages
                        const cached = await this.cacheService.get(
                            {
                                key: CacheKey.KafkaMessageDigest,
                                args: [data.digest],
                                cacheType: CacheType.Memory,
                            }
                        )
                        // if the message is already in cache, skip it
                        if (cached) {
                            continue
                        }
                        // set the message in cache
                        await this.cacheService.set(
                            {
                                key: CacheKey.KafkaMessageDigest,
                                args: [data.digest],
                                cacheResult: true,
                                cacheType: CacheType.Memory,
                            }
                        )
                        // emit event to local EventEmitter
                        this.eventEmitter.emit(
                            getEventName(topic as EventName),
                            data.data
                        )
                        // reset timeout to keep connection alive
                        resetTimeout()
                    }
                }
            }
        )
    }

    /**
     * Cleanup on application shutdown.
     *
     * Note: Consumer disconnect is handled by KafkaConsumerService.
     */
    onApplicationShutdown() {
        // Consumer disconnect is handled by KafkaConsumerService.onApplicationShutdown
        this.kafkaConsumerService.consumer.disconnect()
    }
}


