/**
 * Service that bridges NATS messages to NestJS EventEmitter.
 *
 * Subscribes to NATS subjects and emits events to the local EventEmitter,
 * filtering out messages from the same instance and deduplicating by digest.
 *
 * @example
 * Injected via NatsModule; subscribes on init to configured subjects.
 */
import type {
    NatsConfigMapEntryMetadata 
} from "./types"
import {
    Inject,
    Injectable,
    OnModuleInit,
} from "@nestjs/common"
import {
    EventEmitter2 
} from "@nestjs/event-emitter"
import _ from "lodash"
import {
    CacheKey, CacheService, CacheType 
} from "@modules/cache"
import {
    InstanceService
} from "@modules/mixin"
import {
    configMap 
} from "../config"
import {
    EventName 
} from "../enums"
import {
    getEventName 
} from "../utils"
import {
    NatsMessageFactoryService
} from "./nats-message-factory.service"
import {
    MODULE_OPTIONS_TOKEN,
    OPTIONS_TYPE,
} from "./nats.module-definition"
import {
    RetryService
} from "@modules/mixin"
import {
    NatsStreamConnection 
} from "@modules/stream-async-iterator"
import {
    InjectNats 
} from "./nats.decorators"
import {
    NatsConnection 
} from "nats"
import {
    Dayjs 
} from "dayjs"
import {
    envConfig 
} from "@modules/env"
import {
    StreamAsyncIteratorService 
} from "@modules/stream-async-iterator"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"
import {
    DayjsService 
} from "@modules/mixin"
import {
    v4 
} from "uuid"

/**
 * Service that bridges NATS messages to NestJS EventEmitter.
 *
 * Subscribes to NATS subjects and emits events to the local EventEmitter,
 * filtering out messages from the same instance and deduplicating by digest.
 *
 * @example
 * Injected via NatsModule; subscribes on init to configured subjects.
 */
@Injectable()
export class NatsBridgeService implements OnModuleInit {
    private subjects: Array<string> = []

    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        private readonly eventEmitter: EventEmitter2,
        private readonly natsMessageFactoryService: NatsMessageFactoryService,
        private readonly cacheService: CacheService,
        private readonly instanceService: InstanceService,
        private readonly retryService: RetryService,
        private readonly streamAsyncIteratorService: StreamAsyncIteratorService,
        @InjectNats()
        private readonly nc: NatsConnection,
        private readonly winstonService: WinstonService,
        private readonly dayjsService: DayjsService,
    ) {}

    async onModuleInit(): Promise<void> {
        // get all NATS subjects from config
        const allNatsSubjects = Object.entries(configMap)
            .filter(
                ([, metadata]) =>
                    (metadata as NatsConfigMapEntryMetadata).useNats,
            )
            .map(([eventName]) => eventName)

        // get all subjects from config and intersection with options subjects
        this.subjects = _.intersection(
            allNatsSubjects,
            _.uniq(
                [
                    ...(this.options.subjects ?? []),
                    EventName.Ping
                ]
            ),
        )
        await this.bridgeEvents()

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
    async bridgeEvents(): Promise<void> {
        this.retryService.retry(
            {
                options: {
                    retries: Infinity,
                },
                action: async () => {
                    // create the connection
                    const connection = new NatsStreamConnection(
                        {
                            nc: this.nc,
                            subjects: this.subjects,
                            queueGroup: v4(),
                        }
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
                            envConfig().nats.consumer.idleTimeout,
                        )
                    }
                    // create start time for duration calculation
                    let startTime: Dayjs | null = null
                    // create the stream
                    const stream = await this.streamAsyncIteratorService.createStream({
                        connection,
                        signal: abortController.signal,
                        onOpen: () => {
                            // log connection opened
                            this.winstonService.log(
                                WinstonLog.NatsConsumerOpened,
                                {
                                    subjects: this.subjects
                                }
                            )
                            startTime = this.dayjsService.now()
                        },
                        onClose: () => {
                            // log connection closed
                            this.winstonService.log(
                                WinstonLog.NatsConsumerClosed,
                                {
                                    subjects: this.subjects,
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
                                WinstonLog.NatsConsumerError,
                                {
                                    subjects: this.subjects,
                                    error: error.message,
                                    stack: error.stack,
                                }
                            )
                        },
                    })
                    // reset timeout when the stream is opened
                    resetTimeout()
                    // consume the stream
                    for await (const payload of stream) {
                        // get subject and data
                        const { subject, data } = payload
                        // parse message value
                        const value = new TextDecoder().decode(data) || "{}"
                        const parsed = this.natsMessageFactoryService.parse(value)
                        // skip messages from same instance to prevent loops
                        if (subject === this.instanceService.getId()) {
                            continue
                        }
                        // if subject is ping, skip it
                        if (subject === EventName.Ping) {
                            resetTimeout()
                            continue
                        }
                        // we check the digest to prevent duplicate messages
                        const cached = await this.cacheService.get(
                            {
                                key: CacheKey.NatsMessageDigest,
                                args: [parsed.digest],
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
                                key: CacheKey.NatsMessageDigest,
                                args: [parsed.digest],
                                cacheResult: true,
                                cacheType: CacheType.Memory,
                            }
                        )
                        // emit event to local EventEmitter
                        this.eventEmitter.emit(
                            getEventName(subject as EventName),
                            parsed.data
                        )
                        // reset timeout to keep connection alive
                        resetTimeout()
                    }
                }
            }
        )
    }
}
