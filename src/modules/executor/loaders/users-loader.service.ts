import { 
    ChangeDoc, 
    ExecutorSchema, 
    InjectPrimaryMongoose, 
    UserSchema 
} from "@modules/databases"
import { envConfig } from "@modules/env"
import { Injectable, OnModuleInit } from "@nestjs/common"
import { Connection, Types } from "mongoose"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { Cron, CronExpression } from "@nestjs/schedule"
import { ReadinessWatcherFactoryService } from "@modules/mixin"
import { ResumeToken } from "mongodb"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { EventName } from "@modules/event"
import Decimal from "decimal.js"

@Injectable()
export class UsersLoaderService implements OnModuleInit {
    public users: Array<Partial<UserSchema>> = []
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectWinston()
        private readonly winstonLogger: WinstonLogger,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        private readonly eventEmitter2: EventEmitter2
    ) { 
    }

    // we listen to moongodb changes and reload users
    async onModuleInit() {
        // create a readiness watcher
        this.readinessWatcherFactoryService.createWatcher(UsersLoaderService.name)
        // load users on application bootstrap
        await this.load()
        // observe users
        this.observe()
        // wait until users are loaded
        this.readinessWatcherFactoryService.setReady(UsersLoaderService.name)
    }

    // load users from database
    async load(): Promise<void> {
        // load executor from database
        const executorId = envConfig().botExecutor.executorId
        const executor = await this.connection
            .model<ExecutorSchema>(ExecutorSchema.name)
            .findById(executorId)
        // get added and removed users
        const newUsers: Array<Partial<UserSchema>> =
        executor?.assignedUsers.map(assignedUser => ({ id: assignedUser.userId })) ?? []
        // get old and new user IDs
        const oldUserIds = new Set(this.users.map((user) => user.id))
        const newUserIds = new Set(newUsers.map(user => user.id))
        // emit events
        for (const userId of newUserIds) {
            this.eventEmitter2.emit(
                EventName.UserCreated, 
                { id: userId }
            )
        }
        for (const userId of oldUserIds) {
            this.eventEmitter2.emit(
                EventName.UserDeleted, 
                { id: userId }
            )
        }
        // log executor users count
        this.winstonLogger.debug(
            WinstonLog.UsersLoaded,
            { 
                users: executor?.assignedUsers.length 
            },
        )
        // store only list of IDs
        // check the difference between the list of IDs and the list of users
        this.users = newUsers
    }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async reload() {
        await this.load()
    }

    private observe() {
        const model = this.connection.model<UserSchema>(UserSchema.name)
        // default resume token, it will be updated when a change is detected
        let resumeToken: ResumeToken | null = null
        // create watcher function
        const createWatcher = () => {
            // create change stream
            const changeStream = model.watch(
                [], 
                {
                    fullDocument: "updateLookup",
                    resumeAfter: resumeToken ?? undefined,
                }
            )
            // on change
            changeStream.on("change", (change: ChangeDoc<UserSchema>) => {
                // update resume token
                resumeToken = change._id // update resume token
                // update list
                switch (change.operationType) {
                case "insert": {
                    const data = model.hydrate(change.fullDocument).toJSON<UserSchema>()
                    if (this.users.find((user) => user.id === data.id)) break
                    this.users.push({
                        id: data.id,
                    })
                    this.eventEmitter2.emit(EventName.UserCreated, { id: data.id })
                    break
                } 
                case "delete": {
                    const id = (change.documentKey._id as Types.ObjectId).toString()
                    const idx = this.users.findIndex((user) => user.id === id)
                    if (idx >= 0) this.users.splice(idx, 1)
                    this.eventEmitter2.emit(EventName.UserDeleted, { id })
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
}   
