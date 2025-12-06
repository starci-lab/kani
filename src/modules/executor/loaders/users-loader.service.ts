import { InjectPrimaryMongoose, UserSchema } from "@modules/databases"
import { envConfig } from "@modules/env"
import { Injectable, OnModuleInit } from "@nestjs/common"
import { Connection } from "mongoose"
import { USERS_PER_BATCH } from "./constants"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as winstonLogger } from "winston"
import { Cron, CronExpression } from "@nestjs/schedule"
import { ReadinessWatcherFactoryService } from "@modules/mixin"

@Injectable()
export class UsersLoaderService implements OnModuleInit {
    public userIds: Array<string> = []
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectWinston()
        private readonly winstonLogger: winstonLogger,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) { 
    }

    // we listen to moongodb changes and reload users
    async onModuleInit() {
        // create a readiness watcher
        this.readinessWatcherFactoryService.createWatcher(UsersLoaderService.name)
        // load users on application bootstrap
        await this.load()
        // wait until users are loaded
        this.readinessWatcherFactoryService.setReady(UsersLoaderService.name)
    }

    // load users from database
    async load(): Promise<void> {
        const batchId = envConfig().botExecutor.batchId
    
        const users = await this.connection
            .model<UserSchema>(UserSchema.name)
            .find({}, { _id: 1 })           // only select _id field
            .skip(batchId * USERS_PER_BATCH)
            .limit(USERS_PER_BATCH)
            .lean()                          // return plain objects, no mongoose wrappers
            .exec()
    
        this.winstonLogger.debug(
            WinstonLog.UsersLoaded,
            { users: users.length },
        )
        // store only list of IDs
        this.userIds = users.map((user) => user._id.toString())
    }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async reload() {
        await this.load()
    }
}   
