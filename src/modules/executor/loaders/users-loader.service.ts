import { InjectPrimaryMongoose, UserSchema } from "@modules/databases"
import { envConfig } from "@modules/env"
import { Injectable, OnModuleInit } from "@nestjs/common"
import { Connection } from "mongoose"
import { USERS_PER_BATCH } from "./constants"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { PrimaryMongooseObserverService } from "@modules/databases"
import { Cron, CronExpression } from "@nestjs/schedule"
import { ReadinessWatcherFactoryService } from "@modules/mixin"

@Injectable()
export class UsersLoaderService implements OnModuleInit {
    public users: Array<UserSchema> = []
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectWinston()
        private readonly winstonLogger: WinstonLogger,
        private readonly observerService: PrimaryMongooseObserverService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
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

    // observe users changes
    async observe(): Promise<void> {
        // observe users
        this.observerService.observe({
            filter: [
                { 
                    $match: { 
                        operationType: { $in: ["update", "replace"] } 
                    } 
                }
            ],
            model: this.connection.model<UserSchema>(UserSchema.name),
            list: this.users,
            insertCondition: (data) => {
                if (this.users.some((user) => user.id === data.id)) return false
                return true
            },
            updateCondition: (data) => {
                if (this.users.some((user) => user.id === data.id)) return false
                return true
            },
            deleteCondition: (id) => {
                if (this.users.some((user) => user.id === id)) return false
                return true
            },
        })
    }

    // load users from database
    async load(): Promise<void> {
        const batchId = envConfig().botExecutor.batchId
        const users = await this.connection
            .model<UserSchema>(UserSchema.name)
            .find()
            .skip(batchId * USERS_PER_BATCH)
            .limit(USERS_PER_BATCH)
        this.winstonLogger.debug(
            WinstonLog.UsersLoaded, {
                users: users.length,
            })
        this.users = users.map((user) => user.toJSON())
    }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async reload() {
        await this.load()
    }
}   
