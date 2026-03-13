/**
 * BotsLoaderService - Loader that manages the bot list within the Executor.
 *
 * This service is responsible for:
 * - Loading initial snapshot of bots assigned to the executor from MongoDB
 * - Storing bots in-memory via LokiJS for fast queries
 * - Watching MongoDB Change Stream for real-time updates
 * - Periodic full reload (reconciliation) via scheduled interval
 * - Emitting ExecutorBotUpdated event when changes occur
 */
import {
    BotSchema,
} from "@modules/databases"
import {
    ExecutorSchema,
    InjectPrimaryMongoose,
} from "@modules/databases"
import {
    Injectable,
    OnApplicationBootstrap,
    OnModuleInit,
} from "@nestjs/common"
import {
    Connection,
    Types,
} from "mongoose"
import {
    ResumeToken,
} from "mongodb"
import {
    Interval,
} from "@nestjs/schedule"
import {
    ReadinessWatcherFactoryService,
    RetryService,
} from "@modules/mixin"
import {
    SemaService,
} from "@modules/lock"
import {
    EventEmitterService,
    EventName,
} from "@modules/event"
import {
    MongoDBChangeStreamConnection,
    StreamAsyncIteratorService,
} from "@modules/stream-async-iterator"
import _ from "lodash"
import {
    envConfig,
} from "@modules/env"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"
import {
    Sema,
} from "async-sema"
import {
    ExecutorLoaderService,
} from "./executor-loader.service"
import {
    DayjsService,
} from "@modules/mixin"
import {
    Dayjs
} from "dayjs"
import {
    BotCountMetricService,
} from "@modules/prometheus"

/** Stream name used for logs when watching MongoDB Change Stream */
const STREAM_NAME = "bots-loader"

@Injectable()
export class BotsLoaderService
implements OnApplicationBootstrap, OnModuleInit {
    /**
     * Binary semaphore - ensures load and change stream updates run sequentially,
     * preventing race conditions when writing to botMap concurrently.
     */
    private sema!: Sema

    /**
     * In-memory map holding the bot snapshot by id.
     * Other modules read from here instead of querying MongoDB on each request.
     */
    public botMap: Map<string, BotSchema>

    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly botCountMetricService: BotCountMetricService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        private readonly streamAsyncIteratorService: StreamAsyncIteratorService,
        private readonly retryService: RetryService,
        private readonly eventEmitterService: EventEmitterService,
        private readonly semaService: SemaService,
        private readonly winstonService: WinstonService,
        private readonly dayjsService: DayjsService,
    ) { }

    /**
     * Initializes the service when the NestJS module is ready.
     * Order: wait for ExecutorLoaderService -> create watcher -> semaphore -> init botMap -> load data -> mark ready.
     */
    async onModuleInit() {
        // Wait for ExecutorLoaderService to finish loading (dependency)
        await this.readinessWatcherFactoryService.waitUntilReady(
            ExecutorLoaderService.name,
        )

        this.readinessWatcherFactoryService.createWatcher(
            BotsLoaderService.name,
        )

        // Semaphore capacity=1: only one load/update operation runs at a time
        this.sema = this.semaService.sema(
            BotsLoaderService.name,
            1,
        )

        this.botMap = new Map()

        // Initial load from MongoDB
        await this.load()
        // Mark BotsLoaderService as ready for other services
        this.readinessWatcherFactoryService.setReady(
            BotsLoaderService.name,
        )
    }

    /**
     * Called after all modules have initialized.
     * Starts watching MongoDB Change Stream for real-time updates.
     */
    onApplicationBootstrap() {
        this.observe()
    }

    /**
     * Loads full bot snapshot from MongoDB (full reload).
     * Called on init and on scheduled interval (reconciliation - keeps in sync with DB).
     *
     * Flow:
     * 1. Get list of bots assigned to the current executor
     * 2. Query MongoDB for full documents
     * 3. Compare with old snapshot, emit events for changed bots
     * 4. Replace snapshot with new data
     */
    async load(): Promise<void> {
        const token = await this.sema.tryAcquire()
        if (!token) return

        try {
            const executor = await this.connection
                .model<ExecutorSchema>(ExecutorSchema.name)
                .findById(envConfig().executor.id)

            if (!executor) {
                this.botMap = new Map()
                this.botCountMetricService.set(0)
                return
            }

            // Get IDs of bots assigned to the executor
            const botIds = executor.assignedBots.map(
                (assignedBot) => assignedBot.bot.toString(),
            )

            const model =
                this.connection.model<BotSchema>(BotSchema.name)

            const bots = await model.find({
                _id: {
                    $in: botIds
                },
            })

            const newBots: BotSchema[] =
                bots.map((bot) => bot.toJSON<BotSchema>()) ?? []

            // Compare old and new snapshots (field `running` only) to detect which bots changed
            const updatedBotIds = newBots
                .map((bot) => {
                    const id = bot.id
                    if (!id) return null

                    const old = this.botMap.get(id)
                    if (!old) return null

                    const oldSnapshot = _.pick(old,
                        ["running"])
                    const newSnapshot = _.pick(bot,
                        ["running"])

                    return _.isEqual(oldSnapshot,
                        newSnapshot)
                        ? null
                        : id
                })
                .filter((id): id is string => Boolean(id))

            // If bots changed -> log and emit ExecutorBotUpdated event
            if (updatedBotIds.length > 0) {
                this.winstonService.log(
                    WinstonLog.ExecutorBotsUpdated,
                    {
                        ids: updatedBotIds
                    },
                )

                const updatedRaws = await model
                    .find({
                        _id: {
                            $in: updatedBotIds.map(
                                (id) => new Types.ObjectId(id),
                            ),
                        },
                    })
                    .lean()
                    .exec()

                for (const raw of updatedRaws) {
                    const data =
                        model.hydrate(raw).toJSON<BotSchema>()

                    this.eventEmitterService.emit({
                        event: EventName.ExecutorBotUpdated,
                        payload: data,
                    })
                }
            }

            // Replace entire snapshot with new data
            this.botMap = new Map(
                newBots.map((bot) => [
                    bot.id,
                    bot,
                ]),
            )
            // update prometheus bot count metric
            this.botCountMetricService.set(newBots.length)
        } finally {
            this.sema.release(token)
        }
    }

    /**
     * Watches MongoDB Change Stream for real-time bot updates.
     * Filters only operationType = "update". Uses resumeToken to resume after reconnect.
     * Infinite retries on stream errors. Timeout prevents stream from hanging.
     */
    private observe() {
        const model =
            this.connection.model<BotSchema>(BotSchema.name)

        /** Token to resume stream from last position on reconnect */
        let resumeToken: ResumeToken | null = null

        this.retryService.retry({
            options: {
                retries: Infinity
            },
            action: async () => {
                const abortController = new AbortController()

                /** Timeout to abort stream if no events within configured duration */
                // let timeout: NodeJS.Timeout | undefined

                // const resetTimeout = () => {
                //     if (timeout) clearTimeout(timeout)
                //     timeout = setTimeout(
                //         () => abortController.abort(),
                //         envConfig().executor.streams.mongoDbChangeStream.timeout,
                //     )
                // }

                // create start time for duration calculation
                let startTime: Dayjs | null = null

                // Listen only for update operations, ignore insert/delete
                const streamConnection =
                    new MongoDBChangeStreamConnection<BotSchema>({
                        model,
                        pipeline: [
                            {
                                $match: {
                                    operationType: {
                                        $in: ["update"]
                                    },
                                },
                            },
                        ],
                        options: {
                            fullDocument: "updateLookup", // Fetch full document after update
                            resumeAfter: resumeToken ?? undefined,
                            maxAwaitTimeMS: envConfig().databases.mongoose.primary.maxAwaitTimeMS,
                        },
                    })

                const stream =
                    await this.streamAsyncIteratorService.createStream({
                        connection: streamConnection,
                        signal: abortController.signal,
                        onError: async (error) => {
                            this.winstonService.log(
                                WinstonLog.ExecutorMongoDbChangeStreamError,
                                {
                                    streamName: STREAM_NAME,
                                    error: error.message,
                                },
                            )
                        },
                        onClose: async () => {
                            this.winstonService.log(
                                WinstonLog.ExecutorMongoDbChangeStreamClose,
                                {
                                    streamName: STREAM_NAME,
                                    durationMs: startTime
                                        ? this.dayjsService.now().diff(
                                            startTime,
                                            "millisecond"
                                        )
                                        : null,
                                },
                            )
                        },
                        onOpen: async () => {
                            this.winstonService.log(
                                WinstonLog.ExecutorMongoDbChangeStreamStarted,
                                {
                                    streamName: STREAM_NAME
                                },
                            )
                            startTime = this.dayjsService.now()
                        },
                    })

                // resetTimeout()

                for await (const change of stream) {
                    const token = await this.sema.tryAcquire()
                    if (!token) continue

                    try {
                        resumeToken = change._id
                        switch (change.operationType) {
                        case "update": {
                            const data =
                                    model
                                        .hydrate(change.fullDocument)
                                        .toJSON<BotSchema>()

                            const props: Array<string> = [
                                "running",
                                "name",
                                "liquidityPools",
                                "isExitToUsdc",
                            ]
                            const old = this.botMap.get(data.id)
                            if (!old) break

                            const oldSnapshot = _.pick(old,
                                props)
                            const newSnapshot = _.pick(data,
                                props)

                            if (_.isEqual(oldSnapshot,
                                newSnapshot)) break

                            for (const key of props) {
                                ; (old)[key] = (data)[key]
                            }
                            this.botMap.set(
                                data.id,
                                old,
                            )
                            this.winstonService.log(
                                WinstonLog.ExecutorMongoDbChangeStreamBotUpdated,
                                {
                                    id: data.id
                                },
                            )
                            this.eventEmitterService.emit({
                                event: EventName.ExecutorBotUpdated,
                                payload: data,
                            })
                            break
                        }
                        }
                        //resetTimeout()
                    } finally {
                        this.sema.release(token)
                    }
                }
            },
        })
    }

    /** Scheduled full reload - reconciles in-memory snapshot with MongoDB */
    @Interval(envConfig().executor.interval.load)
    async handleBotsLoaderInterval() {
        await this.load()
    }
}