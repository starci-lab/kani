import { BotSchema, InjectPrimaryMongoose } from "@modules/databases"
import { Injectable, OnModuleInit } from "@nestjs/common"
import { Connection, Types } from "mongoose"
import { Cron, CronExpression } from "@nestjs/schedule"
import { UsersLoaderService } from "./users-loader.service"
import { ReadinessWatcherFactoryService } from "@modules/mixin"
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter"
import { EventName, UserCreatedEvent } from "@modules/event"

@Injectable()
export class BotsLoaderService implements OnModuleInit {
    public bots: Array<Partial<BotSchema>> = []

    constructor(
        private readonly usersLoaderService: UsersLoaderService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        private readonly eventEmitter2: EventEmitter2,
    ) {}

    async onModuleInit() {
        // Wait for UsersLoaderService to finish loading user IDs
        await this.readinessWatcherFactoryService.waitUntilReady(UsersLoaderService.name)
        // Initial load of bot IDs
        await this.load()
    }

    @OnEvent(EventName.UserCreated)
    async onUserCreated({ id }: UserCreatedEvent) {
        const bots = await this.connection
            .model<BotSchema>(BotSchema.name)
            .find({
                user: { $in: [id] },
            })
            .lean()
            .exec()
        this.bots = bots.map((bot) => ({ id: bot._id.toString() }))
        for (const bot of this.bots) {
            this.eventEmitter2.emit(EventName.BotCreated, { id: bot.id })
        }
    }

    // Load bot IDs from database, based on assigned users
    async load(): Promise<void> {
        const userIds = this.usersLoaderService.users.map((user) => user.id)
        if (userIds.length === 0) {
            this.bots = []
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
            .lean()                      // return plain objects, no mongoose wrappers
            .exec()
        this.bots = bots.map((bot) => ({
            id: bot._id.toString(),
        }))
    }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async reload() {
        await this.load()
    }
}