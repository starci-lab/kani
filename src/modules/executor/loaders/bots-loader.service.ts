import {
    BotSchema,
    ExecutorSchema,
    InjectPrimaryMongoose,
} from "@modules/databases"
import {
    Injectable,
    OnApplicationBootstrap,
    OnModuleInit,
} from "@nestjs/common"
import {
    Connection, Types 
} from "mongoose"
import {
    ResumeToken 
} from "mongodb"
import {
    Interval 
} from "@nestjs/schedule"
import {
    ReadinessWatcherFactoryService, RetryService 
} from "@modules/mixin"
import {
    SemaService 
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
    envConfig 
} from "@modules/env"
import {
    WinstonLog, WinstonService
} from "@modules/winston"
import {
    Sema 
} from "async-sema"
import {
    ExecutorLoaderService 
} from "./executor-loader.service"
import {
    Collection 
} from "lokijs"
import {
    LokiJSService 
} from "@modules/mixin"

const STREAM_NAME = "bots-loader"
@Injectable()
export class BotsLoaderService implements OnApplicationBootstrap, OnModuleInit {
    // semaphore for loading bots
    private sema!: Sema
    // bots
    public botCollection: Collection<BotSchema>
    constructor(
    @InjectPrimaryMongoose()
    private readonly connection: Connection,
    private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    private readonly streamAsyncIteratorService: StreamAsyncIteratorService,
    private readonly retryService: RetryService,
    private readonly eventEmitterService: EventEmitterService,
    private readonly semaService: SemaService,
    private readonly winstonService: WinstonService,
    private readonly lokiJSService: LokiJSService,
    ) {}

    async onModuleInit() {
        await this.readinessWatcherFactoryService.waitUntilReady(
            ExecutorLoaderService.name,
        )
        this.readinessWatcherFactoryService.createWatcher(BotsLoaderService.name)
        // init semaphore before any load/observe work uses it
        this.sema = this.semaService.sema(BotsLoaderService.name,
            1)
        this.botCollection = await this.lokiJSService.createCollection<BotSchema>(
            "executor-bots",
            {
                indices: ["id"],
            }
        )
        // load bots
        await this.load()
        // set readiness
        this.readinessWatcherFactoryService.setReady(BotsLoaderService.name)
    }

    onApplicationBootstrap() {
    // observe executors
        this.observe()
    }

    async load(): Promise<void> {
    // run under semaphore
        const token = await this.sema.tryAcquire()
        if (!token) {
            return
        }
        try {
            // get the executor
            const executor = await this.connection
                .model<ExecutorSchema>(ExecutorSchema.name)
                .findById(envConfig().executor.id)
            if (!executor) {
                return
            }
            // get the bot ids
            const botIds = executor.assignedBots.map(
                (assignedBot) => assignedBot.bot.toString(),
            )
            // get the bots model
            const model = this.connection.model<BotSchema>(BotSchema.name)
            // query all bots (include fields used for update detection)
            const bots = await model
                .find({
                    _id: {
                        $in: botIds 
                    } 
                }
                )
            // map the bots to a partial bot schema
            const newBots: Array<BotSchema> = bots.map((bot) => bot.toJSON<BotSchema>()) ?? []
            // detect updated bots by comparing snapshots (excluding created/deleted)
            const updatedBotIds = newBots
                .map((bot) => {
                    const id = bot.id
                    if (!id) return null
                    const old = this.botCollection.find({
                        id 
                    })
                    if (!old) return null
                    // Compare only the fields we fetched for update detection.
                    const oldSnapshot = _.pick(old,
                        ["running"])
                    const newSnapshot = _.pick(bot,
                        ["running"])
                    return _.isEqual(oldSnapshot,
                        newSnapshot) ? null : id
                })
                .filter((id): id is string => Boolean(id))
            // check if there are updated bots
            if (updatedBotIds.length > 0) {
                this.winstonService.log(
                    WinstonLog.ExecutorBotsUpdated,
                    {
                        ids: updatedBotIds,
                    }
                )
                const updatedRaws = await model
                    .find({
                        _id: {
                            $in: updatedBotIds.map((id) => new Types.ObjectId(id)) 
                        },
                    })
                    .lean()
                    .exec()
                for (const raw of updatedRaws) {
                    const data = model.hydrate(raw).toJSON<BotSchema>()
                    this.eventEmitterService.emit(
                        {
                            event: EventName.ExecutorBotUpdated,
                            payload: data,
                        }
                    )
                }
            }
            // update the executors map snapshot
            // remove all bots first
            this.botCollection.clear()
            // insert the new bots
            this.botCollection.insert(newBots)
        } finally {
            if (token) {
                this.sema.release(token)
            }
        }
    }

    private observe() {
        const model = this.connection.model<BotSchema>(BotSchema.name)
        // default resume token, it will be updated when a change is detected
        let resumeToken: ResumeToken | null = null
        // run under semaphore
        this.retryService.retry({
            options: {
                retries: Infinity,
            },
            action: async () => {
                // create a abort controller
                const abortController = new AbortController()
                // create a timeout function
                // create the timeout
                let timeout: NodeJS.Timeout | undefined = undefined
                // create the reset timeout function
                const resetTimeout = () => {
                    if (timeout) {
                        clearTimeout(timeout)
                    }
                    timeout = setTimeout(
                        () => abortController.abort(),
                        envConfig().executor.streams.mongoDbChangeStream.timeout,
                    )
                }
                // create the get resume token function
                // create MongoDB ChangeStream connection
                const streamConnection = new MongoDBChangeStreamConnection<BotSchema>({
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
                        // For "update" events we need the full, post-update document.
                        fullDocument: "updateLookup",
                        resumeAfter: resumeToken ?? undefined,
                    },
                })
                // create the stream
                const stream = await this.streamAsyncIteratorService.createStream({
                    connection: streamConnection,
                    signal: abortController.signal,
                    onError: async (error) => {
                        this.winstonService.log(
                            WinstonLog.ExecutorMongoDbChangeStreamError,
                            {
                                streamName: STREAM_NAME,
                                error: error.message,
                            }
                        )
                    },
                    onClose: async () => {
                        this.winstonService.log(
                            WinstonLog.ExecutorMongoDbChangeStreamClose,
                            {
                                streamName: STREAM_NAME,
                            }
                        )
                    },
                    onOpen: async () => {
                        this.winstonService.log(
                            WinstonLog.ExecutorMongoDbChangeStreamStarted,
                            {
                                streamName: STREAM_NAME,
                            }
                        )
                    },
                })
                for await (const change of stream) {
                    const token = await this.sema.tryAcquire()
                    if (!token) {
                        continue
                    }
                    try {
                        // update resume token
                        resumeToken = change._id
                        // update list
                        switch (change.operationType) {
                        case "update": {
                            const data = model
                                .hydrate(change.fullDocument)
                                .toJSON<BotSchema>()
                            this.winstonService.log(WinstonLog.ExecutorMongoDbChangeStreamBotUpdated,
                                {
                                    id: data.id,
                                })
                            const props: Array<string> = ["running",
                                "name",
                                "liquidityPools",
                                "isExitToUsdc"]
                            const oldSnapshot = _.pick(this.botCollection.find({
                                id: data.id
                            }),
                            )
                            const newSnapshot = _.pick(data,
                                props)
                            if (_.isEqual(oldSnapshot,
                                newSnapshot)) {
                                break
                            }
                            this.botCollection.update(
                                [data]
                            )
                            this.eventEmitterService.emit(
                                {
                                    event: EventName.ExecutorBotUpdated,
                                    payload: data,
                                }
                            )
                            break
                        }
                        }
                        // reset timeout when a change is processed
                        resetTimeout()
                    } finally {
                        if (token) {
                            this.sema.release(token)
                        }
                    }
                }
            },
        })
    }

  @Interval(envConfig().executor.interval.load)
    async handleBotsLoaderInterval() {
        await this.load()
    }
}
