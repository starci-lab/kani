import { BotSchema, InjectPrimaryMongoose } from "@modules/databases"
import { Injectable, OnModuleInit } from "@nestjs/common"
import { Connection, Types } from "mongoose"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as winstonLogger } from "winston"
import { Cron, CronExpression } from "@nestjs/schedule"
import { UsersLoaderService } from "./users-loader.service"
import { ReadinessWatcherFactoryService } from "@modules/mixin"

@Injectable()
export class BotsLoaderService implements OnModuleInit {
    public botIds: Array<string> = []

    constructor(
        private readonly usersLoaderService: UsersLoaderService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectWinston()
        private readonly winstonLogger: winstonLogger,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) {}

    async onModuleInit() {
        // Wait for UsersLoaderService to finish loading user IDs
        await this.readinessWatcherFactoryService.waitUntilReady(UsersLoaderService.name)
        // Initial load of bot IDs
        await this.load()
    }

    // Load bot IDs from database, based on assigned users
    async load(): Promise<void> {
        const userIds = this.usersLoaderService.userIds
        if (userIds.length === 0) {
            this.botIds = []
            return
        }
        const bots = await this.connection
            .model<BotSchema>(BotSchema.name)
            .find(
                {
                    user: { 
                        $in: userIds.map((id) => new Types.ObjectId(id)) 
                    },
                },
                { _id: 1 },              // only select ID
            )
            .lean()                          // return plain objects, no mongoose wrappers
            .exec()
        this.botIds = bots.map((bot) => bot._id.toString())
        this.winstonLogger.debug(WinstonLog.BotsLoaded, {
            bots: this.botIds.length,
        })
    }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async reload() {
        await this.load()
    }
}