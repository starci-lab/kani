import {
    ExecutorSchema,
    InjectPrimaryMongoose,
} from "@modules/databases"
import {
    Injectable, OnApplicationBootstrap, OnModuleInit 
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
    EventName
} from "@modules/event"
import {
    MongoDBChangeStreamConnection, StreamAsyncIteratorService 
} from "@modules/stream-async-iterator"
import _ from "lodash"
import {
    envConfig 
} from "@modules/env"
import {
    WinstonService, WinstonLog 
} from "@modules/winston"
import {
    Sema 
} from "async-sema"

@Injectable()
export class ExecutorsLoaderService implements OnApplicationBootstrap, OnModuleInit {
    // mutex for loading executors
    private sema!: Sema
    // executors
    public executors: Map<string, ExecutorSchema> = new Map()
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        private readonly eventEmitterService: EventEmitterService,
        private readonly streamAsyncIteratorService: StreamAsyncIteratorService,
        private readonly retryService: RetryService,
        private readonly winstonService: WinstonService,
        private readonly semaService: SemaService,
    ) { }

    async onModuleInit() {
        this.readinessWatcherFactoryService.createWatcher(ExecutorsLoaderService.name)
        // init semaphore before any load/observe work uses it
        this.sema = this.semaService.sema(ExecutorsLoaderService.name,
            1)
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
        const token  = await this.sema.tryAcquire()
        if (!token) {
            return
        }
        try {
            const model = this.connection
                .model<ExecutorSchema>(ExecutorSchema.name)
                // query all executors (include fields used for update detection)
            const executorRaws = await model
                .find({
                },
                {
                    _id: 1, version: 1 
                })
                // map the executors to a partial executor schema
            const newExecutors: Array<ExecutorSchema> = executorRaws.map((executor) => executor.toJSON<ExecutorSchema>()) ?? []
            // get the old and new executor ids
            const oldExecutorIds = Array.from(this.executors.keys())
            const newExecutorIds = newExecutors.map(executor => executor.id).filter(Boolean) as Array<string>
            // get the added and removed executor ids
            const createdExecutorIds = _.difference(newExecutorIds,
                oldExecutorIds)
            const deletedExecutorIds = _.difference(oldExecutorIds,
                newExecutorIds)
            // detect updated executors by comparing snapshots (excluding created/deleted)
            const updatedExecutorIds = newExecutors
                .map((executor) => {
                    const id = executor.id
                    if (!id) return null
                    if (createdExecutorIds.includes(id) || deletedExecutorIds.includes(id)) return null
                    const old = this.executors.get(id)
                    if (!old) return null
                    // Compare only the fields we fetched for update detection.
                    const oldSnapshot = _.pick(old,
                        ["version"])
                    const newSnapshot = _.pick(executor,
                        ["version"])
                    return _.isEqual(oldSnapshot,
                        newSnapshot) ? null : id
                })
                .filter((id): id is string => Boolean(id))
                // check if there are created executors
            if (createdExecutorIds.length > 0) {
                this.winstonService.log(
                    WinstonLog.CoordinatorExecutorsCreated,
                    {
                        ids: createdExecutorIds,
                    }
                )
                for (const id of createdExecutorIds) {
                    this.eventEmitterService.emit(
                        {
                            event: EventName.CoordinatorExecutorCreated,
                            payload: {
                                id 
                            },
                        }
                    )
                }
            }
            // check if there are deleted executors
            if (deletedExecutorIds.length > 0) {
                this.winstonService.log(
                    WinstonLog.CoordinatorExecutorsDeleted,
                    {
                        ids: deletedExecutorIds,
                    }
                )
                for (const id of deletedExecutorIds) {
                    this.eventEmitterService.emit(
                        {
                            event: EventName.CoordinatorExecutorDeleted,
                            payload: {
                                id 
                            },
                        }
                    )
                }
            }
            // check if there are updated executors
            if (updatedExecutorIds.length > 0) {
                this.winstonService.log(
                    WinstonLog.CoordinatorExecutorsUpdated,
                    {
                        ids: updatedExecutorIds,
                    }
                )
                const updatedRaws = await model
                    .find(
                        {
                            _id: {
                                $in: updatedExecutorIds.map((id) => new Types.ObjectId(id)) 
                            } 
                        },
                    )
                    .lean()
                    .exec()
                for (const raw of updatedRaws) {
                    const data = model.hydrate(raw).toJSON<ExecutorSchema>()
                    this.eventEmitterService.emit(
                        {
                            event: EventName.CoordinatorExecutorUpdated,
                            payload: data,
                        }
                    )
                }
            }
            // update the executors map snapshot
            this.executors = new Map(
                newExecutors
                    .filter((executor) => Boolean(executor.id))
                    .map((executor) => [executor.id!,
                        executor]),
            )
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
                            envConfig().coordinator.streams.mongoDbChangeStream.timeout,
                        )
                    }
                    // create the get resume token function
                    // create MongoDB ChangeStream connection
                    const streamConnection = new MongoDBChangeStreamConnection<ExecutorSchema>({
                        model,
                        pipeline: [
                            {
                                $match: {
                                    operationType: {
                                        $in: ["insert",
                                            "delete",
                                            "update"] 
                                    },
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
                                this.winstonService.log(
                                    WinstonLog.CoordinatorPrimaryMongoDbChangeStreamError,
                                    {
                                        streamName: "executors-loader",
                                        error: error.message,
                                    })
                            },
                            onClose: async () => {
                                this.winstonService.log(
                                    WinstonLog.CoordinatorPrimaryMongoDbChangeStreamClose,
                                    {
                                        streamName: "executors-loader",
                                    }
                                )

                            },
                            onOpen: async () => {
                                this.winstonService.log(
                                    WinstonLog.CoordinatorPrimaryMongoDbChangeStreamStarted,
                                    {
                                        streamName: "executors-loader",
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
                            case "insert": {
                                const data = model.hydrate(change.fullDocument).toJSON() as ExecutorSchema
                                this.winstonService.log(
                                    WinstonLog.CoordinatorPrimaryMongoDbChangeStreamExecutorCreated,
                                    {
                                        id: data.id,
                                    }
                                )
                                if (this.executors.has(data.id)) break
                                this.executors.set(data.id,
                                    data)
                                this.eventEmitterService.emit({
                                    event: EventName.CoordinatorExecutorCreated,
                                    payload: data,
                                })
                                break
                            }
                            case "delete": {
                                const id = (change.documentKey._id as Types.ObjectId).toString()
                                this.winstonService.log(
                                    WinstonLog.CoordinatorPrimaryMongoDbChangeStreamExecutorDeleted,
                                    {
                                        id,
                                    }
                                )
                                this.executors.delete(id)
                                this.eventEmitterService.emit({
                                    event: EventName.CoordinatorExecutorDeleted,
                                    payload: {
                                        id 
                                    },
                                })
                                break
                            }
                            case "update": {
                                const data = model.hydrate(change.fullDocument).toJSON<ExecutorSchema>() 
                                this.winstonService.log(
                                    WinstonLog.CoordinatorPrimaryMongoDbChangeStreamExecutorUpdated,
                                    {
                                        id: data.id,
                                    }
                                )
                                const oldSnapshot = _.pick(this.executors.get(data.id),
                                    ["version"])
                                const newSnapshot = _.pick(data,
                                    ["version"])
                                if (_.isEqual(oldSnapshot,
                                    newSnapshot)) {
                                    break
                                }
                                this.executors.set(data.id,
                                    data)
                                this.eventEmitterService.emit(
                                    {
                                        event: EventName.CoordinatorExecutorUpdated,
                                        args: [data.id],
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
                }
            }
        )
    }

    @Interval(
        envConfig().coordinator.interval.load,
    )
    async handleLoadInterval() {
        await this.load()
    }
}