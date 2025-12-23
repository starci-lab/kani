import { 
    ChangeDoc,
    ExecutorSchema, 
    InjectPrimaryMongoose, 
} from "@modules/databases"
import { Injectable, OnModuleInit } from "@nestjs/common"
import { Connection, Types } from "mongoose"
import { ResumeToken } from "mongodb"
import { Cron, CronExpression } from "@nestjs/schedule"
import { ReadinessWatcherFactoryService } from "@modules/mixin"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { EventName } from "@modules/event"
import Decimal from "decimal.js"

@Injectable()
export class ExecutorsLoaderService implements OnModuleInit {
    public executors: Array<Partial<ExecutorSchema>> = []
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        private readonly eventEmitter2: EventEmitter2,
    ) {}

    async onModuleInit() {
        this.readinessWatcherFactoryService.createWatcher(ExecutorsLoaderService.name)
        await this.load()
        this.observe()
        this.readinessWatcherFactoryService.setReady(ExecutorsLoaderService.name)
    }
    
    async load(): Promise<void> {
        // we load the executor ids from the database
        const executorRaws = await this.connection
            .model<ExecutorSchema>(ExecutorSchema.name)
            .find({}, { _id: 1 })
            .select({ _id: 1 })
            .lean()
            .exec()
        // get added and removed executors
        const newExecutors: Array<Partial<ExecutorSchema>> =
        executorRaws.map((executorRaw) => ({ id: executorRaw._id.toString() })) ?? []
        const oldExecutorIds = new Set(this.executors.map((executor) => executor.id))
        const newExecutorIds = new Set(newExecutors.map((executor) => executor.id))
        // emit events
        for (const executorId of newExecutorIds) {
            this.eventEmitter2.emit(EventName.ExecutorCreated, { id: executorId })
        }
        for (const executorId of oldExecutorIds) {
            this.eventEmitter2.emit(EventName.ExecutorDeleted, { id: executorId })
        }
        // we transform the executor raw to a partial executor schema
        this.executors = newExecutors
    }

    private observe() {
        const model = this.connection.model<ExecutorSchema>(ExecutorSchema.name)
        // default resume token, it will be updated when a change is detected
        let resumeToken: ResumeToken | null = null
        // create watcher function
        const createWatcher = () => {
            // create change stream
            const changeStream = model.watch(
                [], {
                    fullDocument: "updateLookup",
                    resumeAfter: resumeToken ?? undefined,
                })
            // on change
            changeStream.on("change", (change: ChangeDoc<ExecutorSchema>) => {
                // update resume token
                resumeToken = change._id // update resume token
                // update list
                switch (change.operationType) {
                case "insert": {
                    const data = model.hydrate(change.fullDocument).toJSON<ExecutorSchema>()
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
            })
            changeStream.on("error", () => {
                restartWatcher()
            })
            changeStream.on("close", () => {
                restartWatcher()
            })
            return changeStream
        }
        // restart watcher
        let restarting = false
        let retryDelay = 500 // ms

        // restart watcher function
        const restartWatcher = () => {
            if (restarting) return
            restarting = true
            // restart watcher
            setTimeout(() => {
                createWatcher()
                restarting = false
                retryDelay = Decimal.max(new Decimal(retryDelay).mul(2), new Decimal(5000)).toNumber()
            }, retryDelay)
        }
        // start watcher
        createWatcher()
    }

    @Cron(CronExpression.EVERY_DAY_AT_10AM)
    async reload() {
        await this.load()
    }
}