import {
    AppVersion,
    BotSchema,
    ExecutorSchema,
    InjectPrimaryMongoose,
} from "@modules/databases"
import { Injectable, OnApplicationBootstrap, OnModuleInit } from "@nestjs/common"
import { Connection, Types } from "mongoose"
import { ResumeToken } from "mongodb"
import { Interval } from "@nestjs/schedule"
import { ReadinessWatcherFactoryService, RetryService } from "@modules/mixin"
import { SemaService } from "@modules/lock"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { EventName } from "@modules/event"
import { MongoDBChangeStreamConnection, StreamAsyncIteratorService } from "@modules/stream-async-iterator"
import _ from "lodash"
import { envConfig } from "@modules/env"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { Sema } from "async-sema"

@Injectable()
export class ExecutorLoaderService implements OnApplicationBootstrap, OnModuleInit {
    // mutex for loading executor
    private sema!: Sema
    // executor
    public executor: Partial<ExecutorSchema> | null = null
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
    ) { }

    async onModuleInit() {
        this.readinessWatcherFactoryService.createWatcher(ExecutorLoaderService.name)
        // init mutex before any load/observe work uses it
        this.sema = this.semaService.sema(ExecutorLoaderService.name, 1)
        // load executor
        await this.load()
        // set readiness
        this.readinessWatcherFactoryService.setReady(ExecutorLoaderService.name)
    }

    onApplicationBootstrap() {
        // observe executors
        this.observe()
    }

    async load(): Promise<void> {
        // run under semaphore
        const token  = await this.sema.tryAcquire()
        if (!token) {
            return
        }
        try {
            // get the executor
            const executor = await this.connection
                .model<ExecutorSchema>(ExecutorSchema.name)
                .findById(envConfig().executor.id)
            if (!executor) {
                this.logger.error(
                    WinstonLog.ExecutorNotFound, {
                        id: envConfig().executor.id,
                    }
                )
                return
            }
            // if the executor is the same as the cached executor, we check if the bots is created or deleted
            if (this.executor && this.executor.id === executor.id) {
                const newBotIds = executor.assignedBots.map(assignedBot => assignedBot?.botId).filter((id): id is string => Boolean(id))
                const oldBotIds = this.executor?.assignedBots?.map(assignedBot => assignedBot?.botId).filter((id): id is string => Boolean(id)) ?? []
                const createdBotIds = _.difference(newBotIds, oldBotIds)
                const deletedBotIds = _.difference(oldBotIds, newBotIds)
                if (createdBotIds.length > 0) {
                    this.logger.verbose(
                        WinstonLog.ExecutorBotsCreated, {
                            ids: createdBotIds,
                        }
                    )
                    for (const id of createdBotIds) {
                        this.eventEmitter2.emit(EventName.ExecutorBotCreated, { id })
                    }
                }   
                if (deletedBotIds.length > 0) {
                    this.logger.verbose(
                        WinstonLog.ExecutorBotsDeleted, {
                            ids: deletedBotIds,
                        }
                    )
                    for (const id of deletedBotIds) {
                        this.eventEmitter2.emit(EventName.ExecutorBotDeleted, { id })
                    }
                }
            }
            this.executor = executor.toJSON<ExecutorSchema>()
        } finally {
            if (token) {
                this.sema.release(token)
            }
        }
    }

    private observe() {
        const model = this.connection.model<ExecutorSchema>(ExecutorSchema.name)
        // default resume token, it will be updated when a change is detected
        let resumeToken: ResumeToken | null = null
        // run under semaphore
        this.retryService.retry(
            {
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
                    const streamConnection = new MongoDBChangeStreamConnection<ExecutorSchema>({
                        model,
                        pipeline: [
                            {
                                $match: {
                                    operationType: { $in: ["update"] },
                                    "documentKey._id": new Types.ObjectId(envConfig().executor.id),
                                },
                            },
                        ],
                        options: {
                            // For "update" events we need the full, post-update document.
                            fullDocument: "updateLookup",
                            resumeAfter: resumeToken ?? undefined,
                        }
                    })
                    // create the stream
                    const stream = await this.streamAsyncIteratorService.createStream(
                        {
                            connection: streamConnection,
                            signal: abortController.signal,
                            onError: async (error) => {
                                this.logger.error(
                                    WinstonLog.MongooseChangeStreamError, {
                                        streamName: "executor-loader",
                                        error: error.message,
                                    })
                            },
                            onClose: async () => {
                                this.logger.error(
                                    WinstonLog.MongooseChangeStreamClose, {
                                        streamName: "executor-loader",
                                    }
                                )

                            },
                            onOpen: async () => {
                                this.logger.info(
                                    WinstonLog.MongooseChangeStreamStarted, {
                                        streamName: "executor-loader",
                                    }
                                )
                            },
                        }
                    )
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
                                const data = model.hydrate(change.fullDocument).toJSON<ExecutorSchema>() 
                                const assignedBots = data.assignedBots.map(assignedBot => assignedBot?.botId).filter((id): id is string => Boolean(id))
                                const oldAssignedBots = this.executor?.assignedBots?.map(assignedBot => assignedBot?.botId).filter((id): id is string => Boolean(id)) ?? []
                                const createdBotIds = _.difference(assignedBots, oldAssignedBots)
                                const deletedBotIds = _.difference(oldAssignedBots, assignedBots)
                                if (createdBotIds.length > 0) {
                                    // ensure the bots created persists in the database
                                    const createdBots = await this.connection
                                        .model<BotSchema>(BotSchema.name)
                                        .find({ _id: { $in: createdBotIds.map((id) => new Types.ObjectId(id)) } })
                                    const jsonCreatedBots = createdBots?.map((bot) => bot.toJSON<BotSchema>()) ?? []
                                    const filteredCreatedBots = jsonCreatedBots
                                        .filter((bot) => Boolean(bot.id) && bot.version === AppVersion.V2)
                                        .map((bot) => ({ id: bot.id }))
                                    // log the created bots
                                    this.logger.verbose(WinstonLog.ExecutorBotsCreated, {
                                        ids: filteredCreatedBots.map((bot) => bot.id),
                                    })
                                    // emit the event for the created bots
                                    for (const bot of filteredCreatedBots) {
                                        this.eventEmitter2.emit(EventName.ExecutorBotCreated, { id: bot.id })
                                    }
                                }
                                if (deletedBotIds.length > 0) {
                                    // ensure the bots deleted persists in the database
                                    const deletedBots = await this.connection
                                        .model<BotSchema>(BotSchema.name)
                                        .find({ _id: { $in: deletedBotIds.map((id) => new Types.ObjectId(id)) } })
                                    const flattenedDeletedBots = deletedBots?.map((bot) => bot.toJSON<BotSchema>()) ?? []
                                    const filteredDeletedBots = flattenedDeletedBots
                                        .filter((bot) => Boolean(bot.id) && bot.version === AppVersion.V2)
                                        .map((bot) => ({ id: bot.id }))
                                    // log the deleted bots
                                    this.logger.verbose(
                                        WinstonLog.ExecutorBotsDeleted, {
                                            ids: filteredDeletedBots.map((bot) => bot.id),
                                        }
                                    )
                                    // emit the event for the deleted bots
                                    for (const bot of filteredDeletedBots) {
                                        this.eventEmitter2.emit(EventName.ExecutorBotDeleted, { id: bot.id })
                                    }
                                }
                                this.executor = data
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
                }
            }
        )
    }

    @Interval(
        envConfig().timeConfig.interval.executor.executorLoader
    )
    async handleExecutorLoaderInterval() {
        await this.load()
    }
}