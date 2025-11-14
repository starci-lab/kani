import { BotSchema, InjectPrimaryMongoose } from "@modules/databases"
import { Injectable, OnModuleInit } from "@nestjs/common"
import { Connection, Types } from "mongoose"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { PrimaryMongooseObserverService } from "@modules/databases"
import { Cron, CronExpression } from "@nestjs/schedule"
import { UsersLoaderService } from "./users-loader.service"
import { ReadinessWatcherFactoryService } from "@modules/mixin"

@Injectable()
export class BotsLoaderService implements OnModuleInit {
    bots: Array<BotSchema> = []
    constructor(
        private readonly usersLoaderService: UsersLoaderService,
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
        await this.readinessWatcherFactoryService.waitUntilReady(UsersLoaderService.name)
        // load bots on application bootstrap
        await this.load()
        // observe bots
        await this.observe()
    }

    // observe bots changes
    async observe(): Promise<void> {
        const userIds = this.usersLoaderService.users.map((user) => user.id)
        // observe bots
        this.observerService.observe({
            filter: [
                { 
                    $match: { 
                        operationType: { $in: ["update", "replace", "insert", "delete"] } 
                    } 
                }
            ],
            model: this.connection.model<BotSchema>(BotSchema.name),
            list: this.bots,
            insertCondition: (data) => {
                if (!userIds.includes(data.user.toString())) return false
                return true
            },
            updateCondition: (data) => {
                if (!this.bots.some((bot) => bot.id === data.id)) return false
                return true
            },
            deleteCondition: (id) => {
                if (!this.bots.map((bot) => bot.id).includes(id)) return false
                return true
            },
        })
    }

    // load bots from database
    async load(): Promise<void> {
        const bots = await this.connection
            .model<BotSchema>(BotSchema.name)
            .find({ 
                user: { 
                    $in: this.usersLoaderService.users.map((user) => new Types.ObjectId(user.id)) }
            })
        this.winstonLogger.debug(
            WinstonLog.BotsLoaded, {
                bots: bots.length,
            })
        this.bots = bots.map((bot) => bot.toJSON())
    }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async reload() {
        await this.load()
    }
}   
