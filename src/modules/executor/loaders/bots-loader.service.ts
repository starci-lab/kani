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
import { Connection, Types } from "mongoose"
import { ResumeToken } from "mongodb"
import { Interval } from "@nestjs/schedule"
import { ReadinessWatcherFactoryService, RetryService } from "@modules/mixin"
import { SemaService } from "@modules/lock"
import { EventEmitter2 } from "@nestjs/event-emitter"
import {
    CoordinatorExecutorUpdatedEvent,
    createEventName,
    EventName,
    ExecutorBotUpdatedEvent,
} from "@modules/event"
import {
    MongoDBChangeStreamConnection,
    StreamAsyncIteratorService,
} from "@modules/stream-async-iterator"
import _ from "lodash"
import { envConfig } from "@modules/env"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { Sema } from "async-sema"
import { ExecutorLoaderService } from "./executor-loader.service"
import { WithId } from "@typedefs"

@Injectable()
export class BotsLoaderService implements OnApplicationBootstrap, OnModuleInit {
    // mutex for loading bots
    private sema!: Sema
    // bots
    public bots: Map<string, Partial<BotSchema>> = new Map()
    constructor(
    @InjectPrimaryMongoose()
    private readonly connection: Connection,
    private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    private readonly eventEmitter2: EventEmitter2,
    private readonly streamAsyncIteratorService: StreamAsyncIteratorService,
    private readonly retryService: RetryService,
    @InjectWinston()
    private readonly logger: WinstonLogger,
    private readonly semaService: SemaService,
    ) {}

    async onModuleInit() {
        await this.readinessWatcherFactoryService.waitUntilReady(
            ExecutorLoaderService.name,
        )
        this.readinessWatcherFactoryService.createWatcher(BotsLoaderService.name)
        // init mutex before any load/observe work uses it
        this.sema = this.semaService.sema(BotsLoaderService.name, 1)
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
                (assignedBot) => assignedBot.botId,
            )
            // get the bots model
            const model = this.connection.model<BotSchema>(BotSchema.name)
            // query all bots (include fields used for update detection)
            const botRaws = await model
                .find({ _id: { $in: botIds } }, { _id: 1, version: 1 })
                .lean()
                .exec()
            // map the bots to a partial bot schema
            const newBots: Array<Partial<BotSchema>> =
        botRaws?.map((bot) => ({
            id: bot._id.toString(),
            version: bot.version,
        })) ?? []
            // detect updated bots by comparing snapshots (excluding created/deleted)
            const updatedBotIds = newBots
                .map((bot) => {
                    const id = bot.id
                    if (!id) return null
                    const old = this.bots.get(id)
                    if (!old) return null
                    // Compare only the fields we fetched for update detection.
                    const oldSnapshot = _.pick(old, ["running"])
                    const newSnapshot = _.pick(bot, ["running"])
                    return _.isEqual(oldSnapshot, newSnapshot) ? null : id
                })
                .filter((id): id is string => Boolean(id))
            // check if there are updated bots
            if (updatedBotIds.length > 0) {
                this.logger.verbose(
                    WinstonLog.ExecutorBotsUpdated, {
                        ids: updatedBotIds,
                    }
                )
                const updatedRaws = await model
                    .find({
                        _id: { $in: updatedBotIds.map((id) => new Types.ObjectId(id)) },
                    })
                    .lean()
                    .exec()
                for (const raw of updatedRaws) {
                    const data = model.hydrate(raw).toJSON<ExecutorSchema>()
                    const event: CoordinatorExecutorUpdatedEvent = data
                    this.eventEmitter2.emit(
                        createEventName(
                            EventName.ExecutorBotUpdated, {
                                id: data.id,
                            }),
                        event,
                    )
                }
            }
            // update the executors map snapshot
            this.bots = new Map(
                newBots
                    .filter((bot): bot is WithId<Partial<BotSchema>> =>
                        Boolean(bot.id),
                    )
                    .map((bot) => [bot.id!, bot]),
            )
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
                        envConfig().timeConfig.ws.idleTimeout.mongoDbChangeStream.loader,
                    )
                }
                // create the get resume token function
                // create MongoDB ChangeStream connection
                const streamConnection = new MongoDBChangeStreamConnection<BotSchema>({
                    model,
                    pipeline: [
                        {
                            $match: {
                                operationType: { $in: ["update"] },
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
                        this.logger.error(WinstonLog.MongooseChangeStreamError, {
                            streamName: "bots-loader",
                            error: error.message,
                        })
                    },
                    onClose: async () => {
                        this.logger.error(WinstonLog.MongooseChangeStreamClose, {
                            streamName: "bots-loader",
                        })
                    },
                    onOpen: async () => {
                        this.logger.info(WinstonLog.MongooseChangeStreamStarted, {
                            streamName: "bots-loader",
                        })
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
                            this.logger.verbose(WinstonLog.ExecutorChangeStreamBotUpdated, {
                                id: data.id,
                            })
                            const props: Array<string> = ["running", "name", "liquidityPools","isExitToUsdc"]
                            const oldSnapshot = _.pick(this.bots.get(data.id), props)
                            const newSnapshot = _.pick(data, props)
                            if (_.isEqual(oldSnapshot, newSnapshot)) {
                                break
                            }
                            this.bots.set(data.id, data)
                            const event: ExecutorBotUpdatedEvent = data
                            this.eventEmitter2.emit(
                                createEventName(EventName.ExecutorBotUpdated, {
                                    id: data.id,
                                }),
                                event,
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

  @Interval(envConfig().timeConfig.interval.executor.botsLoader)
    async handleBotsLoaderInterval() {
        await this.load()
    }
}
