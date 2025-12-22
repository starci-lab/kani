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
        this.observeExecutors()
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
        // we transform the executor raw to a partial executor schema
        this.executors = executorRaws.map((executorRaw) => (
            { 
                // we only need the id of the executor
                id: executorRaw._id.toString() 
            }
        ))
    }

    private observeExecutors() {
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
                try {
                // update resume token
                    resumeToken = change._id // update resume token
                    // update list
                    switch (change.operationType) {
                    case "insert": {
                        const data = model.hydrate(change.fullDocument).toJSON<ExecutorSchema>()
                        if (this.executors.find((executor) => executor.id === data.id)) break
                        this.executors.push({ id: data.id })
                        this.eventEmitter2.emit(EventName.ExecutorCreated, { id: data.id })
                        break
                    } 
                    case "delete": {
                        const id = (change.documentKey._id as Types.ObjectId).toString()
                        const idx = this.executors.findIndex((executor) => executor.id === id)
                        if (idx >= 0) this.executors.splice(idx, 1)
                        this.eventEmitter2.emit(EventName.ExecutorDeleted, { id })
                        break
                    }
                    }
                } catch (err) {
                    console.error(err)
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
                retryDelay = Math.min(retryDelay * 2, 5000)
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