import {
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
import { CoordinatorExecutorUpdatedEvent, createEventName, EventName } from "@modules/event"
import { MongoDBChangeStreamConnection, StreamAsyncIteratorService } from "@modules/stream-async-iterator"
import _ from "lodash"
import { envConfig } from "@modules/env"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { Sema } from "async-sema"

@Injectable()
export class ExecutorsLoaderService implements OnApplicationBootstrap, OnModuleInit {
    // mutex for loading executors
    private sema: Sema
    // executors
    public executors: Array<Partial<ExecutorSchema>> = []
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
        this.readinessWatcherFactoryService.createWatcher(ExecutorsLoaderService.name)
        // init mutex before any load/observe work uses it
        this.sema = this.semaService.sema(ExecutorsLoaderService.name, 1)
        // load executors
        await this.load()
        // set readiness
        this.readinessWatcherFactoryService.setReady(ExecutorsLoaderService.name)
    }

    onApplicationBootstrap() {
        // observe executors
        this.observe()
    }

    async load(): Promise<void> {
        // run under semaphore
        await this.sema.acquire()
        try {
            const model = this.connection
                .model<ExecutorSchema>(ExecutorSchema.name)
                // query all executors (include fields used for update detection)
            const executorRaws = await model
                .find({}, { _id: 1, version: 1 })
                .lean()
                .exec()
                // map the executors to a partial executor schema
            const newExecutors: Array<Partial<ExecutorSchema>> =
                    executorRaws?.map(
                        executor => ({
                            id: executor._id.toString(),
                            // used for update detection
                            version: executor.version,
                        })) ?? []
            // get the old and new executor ids
            const oldExecutorIds = this.executors.map(executor => executor.id).filter(Boolean) as Array<string>
            const newExecutorIds = newExecutors.map(executor => executor.id).filter(Boolean) as Array<string>
            // get the added and removed executor ids
            const createdExecutorIds = _.difference(newExecutorIds, oldExecutorIds)
            const deletedExecutorIds = _.difference(oldExecutorIds, newExecutorIds)
            // detect updated executors by comparing snapshots (excluding created/deleted)
            const oldById = _.keyBy(this.executors, "id")
            const updatedExecutorIds = newExecutors
                .map((executor) => {
                    const id = executor.id
                    if (!id) return null
                    if (createdExecutorIds.includes(id) || deletedExecutorIds.includes(id)) return null
                    const old = oldById[id]
                    if (!old) return null
                    // Compare only the fields we fetched for update detection.
                    const oldSnapshot = _.pick(old, ["version"])
                    const newSnapshot = _.pick(executor, ["version"])
                    return _.isEqual(oldSnapshot, newSnapshot) ? null : id
                })
                .filter(Boolean) as Array<string>
                // check if there are created executors
            if (createdExecutorIds.length > 0) {
                this.logger.verbose(
                    WinstonLog.CoordinatorExecutorsCreated, {
                        ids: createdExecutorIds,
                    }
                )
                for (const id of createdExecutorIds) {
                    this.eventEmitter2.emit(EventName.CoordinatorExecutorCreated, { id })
                }
            }
            // check if there are deleted executors
            if (deletedExecutorIds.length > 0) {
                this.logger.verbose(
                    WinstonLog.CoordinatorExecutorsDeleted, {
                        ids: deletedExecutorIds,
                    }
                )
                for (const id of deletedExecutorIds) {
                    this.eventEmitter2.emit(EventName.CoordinatorExecutorDeleted, { id })
                }
            }
            // check if there are updated executors
            if (updatedExecutorIds.length > 0) {
                this.logger.verbose(
                    WinstonLog.CoordinatorExecutorsUpdated, {
                        ids: updatedExecutorIds,
                    }
                )
                const updatedRaws = await model
                    .find(
                        { _id: { $in: updatedExecutorIds.map((id) => new Types.ObjectId(id)) } },
                    )
                    .lean()
                    .exec()
                for (const raw of updatedRaws) {
                    const data = model.hydrate(raw).toJSON<ExecutorSchema>()
                    const event: CoordinatorExecutorUpdatedEvent = {
                        executor: data,
                    }
                    this.eventEmitter2.emit(
                        createEventName(
                            EventName.CoordinatorExecutorUpdated, { id: data.id }
                        ),
                        event,
                    )
                }
            }
            // update the executors list
            this.executors = newExecutors
        } finally {
            this.sema.release()
        }
    }

    private async observe() {
        const model = this.connection.model<ExecutorSchema>(ExecutorSchema.name)
        // default resume token, it will be updated when a change is detected
        let resumeToken: ResumeToken | null = null
        // run under semaphore
        await this.retryService.retry(
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
                                    operationType: { $in: ["insert", "delete", "update"] },
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
                                        streamName: "executors-loader",
                                        error: error.message,
                                    })
                            },
                            onClose: async () => {
                                this.logger.error(
                                    WinstonLog.MongooseChangeStreamClose, {
                                        streamName: "executors-loader",
                                    }
                                )

                            },
                            onOpen: async () => {
                                this.logger.info(
                                    WinstonLog.MongooseChangeStreamStarted, {
                                        streamName: "executors-loader",
                                    }
                                )
                            },
                        }
                    )
                    for await (const change of stream) {
                        await this.sema.acquire()
                        try {   
                            // update resume token
                            resumeToken = change._id
                            // update list
                            switch (change.operationType) {
                            case "insert": {
                                const data = model.hydrate(change.fullDocument).toJSON() as ExecutorSchema
                                this.logger.verbose(
                                    WinstonLog.CoordinatorExecutorChangeStreamCreated, {
                                        id: data.id,
                                    }
                                )
                                if (this.executors.find((executor) => executor.id === data.id)) break
                                this.executors.push({
                                    id: data.id,
                                })
                                this.eventEmitter2.emit(EventName.CoordinatorExecutorCreated, { id: data.id })
                                break
                            }
                            case "delete": {
                                const id = (change.documentKey._id as Types.ObjectId).toString()
                                this.logger.verbose(
                                    WinstonLog.CoordinatorExecutorChangeStreamDeleted, {
                                        id,
                                    }
                                )
                                const idx = this.executors.findIndex((executor) => executor.id === id)
                                if (idx >= 0) this.executors.splice(idx, 1)
                                this.eventEmitter2.emit(EventName.CoordinatorExecutorDeleted, { id })
                                break
                            }
                            case "update": {
                                const data = model.hydrate(change.fullDocument).toJSON() as ExecutorSchema
                                this.logger.verbose(
                                    WinstonLog.CoordinatorExecutorChangeStreamUpdated, {
                                        id: data.id,
                                    }
                                )
                                const idx = this.executors.findIndex((executor) => executor.id === data.id)
                                if (idx >= 0) {
                                    // keep local snapshot fresh for update detection in `load()`
                                    this.executors[idx] = {
                                        ...this.executors[idx],
                                        id: data.id,
                                        version: data.version,
                                    }
                                } else {
                                    // If we somehow missed the insert, treat it as created locally.
                                    this.executors.push(
                                        {
                                            id: data.id,
                                            version: data.version,
                                        }
                                    )
                                }
                                const event: CoordinatorExecutorUpdatedEvent = { executor: data }
                                this.eventEmitter2.emit(
                                    createEventName(EventName.CoordinatorExecutorUpdated, { id: data.id }),
                                    event,
                                )
                                break
                            }
                            }
                            // reset timeout when a change is processed
                            resetTimeout()
                        } finally {
                            this.sema.release()
                        }
                    }
                }
            }
        )
    }

    @Interval(
        envConfig().timeConfig.interval.coordinator.executorsLoader
    )
    async handleExecutorsLoaderInterval() {
        await this.load()
    }
}