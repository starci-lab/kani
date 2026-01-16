import { 
    ExecutorSchema, 
    InjectPrimaryMongoose, 
} from "@modules/databases"
import { Injectable, OnApplicationBootstrap, OnModuleInit } from "@nestjs/common"
import { Connection, Types } from "mongoose"
import { ResumeToken } from "mongodb"
import { Interval } from "@nestjs/schedule"
import { ReadinessWatcherFactoryService, RetryService } from "@modules/mixin"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { EventName } from "@modules/event"
import { MongoDBChangeStreamConnection, StreamAsyncIteratorService } from "@modules/stream-async-iterator"
import _ from "lodash"
import { envConfig } from "@modules/env"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"

@Injectable()
export class ExecutorsLoaderService implements OnApplicationBootstrap, OnModuleInit {
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
    ) {}

    async onModuleInit() {
        this.readinessWatcherFactoryService.createWatcher(ExecutorsLoaderService.name)
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
        // query all executors
        const executorRaws = await this.connection
            .model<ExecutorSchema>(ExecutorSchema.name)
            .find({}, { _id: 1 })
            .lean()
            .exec()
        // map the executors to a partial executor schema
        const newExecutors: Array<Partial<ExecutorSchema>> =
          executorRaws?.map(executor => ({ id: executor._id.toString() })) ?? []
        // get the old and new executor ids
        const oldExecutorIds = this.executors.map(e => e.id)
        const newExecutorIds = newExecutors.map(e => e.id)     
        // get the added and removed executor ids
        const addedExecutorIds = _.difference(newExecutorIds, oldExecutorIds)
        const removedExecutorIds = _.difference(oldExecutorIds, newExecutorIds)  
        // emit events
        for (const id of addedExecutorIds) {
            this.eventEmitter2.emit(EventName.ExecutorCreated, { id })
        }
        // emit events for removed executors
        for (const id of removedExecutorIds) {
            this.eventEmitter2.emit(EventName.ExecutorDeleted, { id })
        }
        // update the executors
        this.executors = newExecutors
    }

    private async observe() {
        const model = this.connection.model<ExecutorSchema>(ExecutorSchema.name)
        // default resume token, it will be updated when a change is detected
        let resumeToken: ResumeToken | null = null
        await this.retryService.retry({
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
                                operationType: { $in: ["insert", "delete"] },
                            },
                        },
                    ],
                    options: {
                        fullDocument: "default",
                        resumeAfter: resumeToken ?? undefined,
                    }
                })
                // create the stream
                const stream = await this.streamAsyncIteratorService.createStream({
                    connection: streamConnection,
                    signal: abortController.signal,
                    onError: async () => {
                        this.logger.error(
                            WinstonLog.MongooseChangeStreamError, {
                                message: "MongoDB ChangeStream error",
                                streamName: "executors-loader",
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
                })
                // process changes
                for await (const change of stream) {
                    // update resume token
                    resumeToken = change._id      
                    // update list
                    switch (change.operationType) {
                    case "insert": {
                        const data = model.hydrate(change.fullDocument).toJSON() as ExecutorSchema
                        if (this.executors.find((executor) => executor.id === data.id)) break
                        this.executors.push({
                            id: data.id,
                        })
                        this.eventEmitter2.emit(EventName.ExecutorCreated, { id: data.id })
                        break
                    } 
                    case "delete": {
                        const id = (change.documentKey._id as Types.ObjectId).toString()
                        const idx = this.executors.findIndex((executorId) => executorId === id)
                        if (idx >= 0) this.executors.splice(idx, 1)
                        this.eventEmitter2.emit(EventName.ExecutorDeleted, { id })
                        break
                    }
                    }
                    // reset timeout when a change is processed
                    resetTimeout()
                }
            },
            options: {
                retries: Infinity,
            }
        })
    }

    @Interval(envConfig().timeConfig.interval.coordinator.executorsLoader)
    async handleExecutorsLoaderInterval() {
        await this.load()
    }
}