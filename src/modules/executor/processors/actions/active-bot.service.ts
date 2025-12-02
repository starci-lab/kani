import { Inject, Injectable } from "@nestjs/common"
import { REQUEST } from "@nestjs/core"
import { Scope } from "@nestjs/common"
import { envConfig } from "@modules/env"
import { BotSchema, InjectPrimaryMongoose, PositionSchema } from "@modules/databases"
import { Connection } from "mongoose"
import { BotNotFoundException } from "@exceptions"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { createEventName, EventName } from "@modules/event"
import { ReadinessWatcherFactoryService } from "@modules/mixin"
import { BalanceProcessorService } from "./balance.service"
import { OpenPositionProcessorService } from "./open-position.service"
import { ClosePositionProcessorService } from "./close-position.service"
import { DistributorProcessorService } from "./distributor.service"
import { sleep } from "@modules/common"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"

@Injectable({
    scope: Scope.REQUEST,
    durable: true,
})
export class ActiveBotProcessorService {
    private bot: BotSchema
    constructor(
        @Inject(REQUEST)
        private readonly request: ActiveBotProcessorRequest,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly eventEmitter: EventEmitter2,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) {}

    async initialize() {
        // sleep 10ms to ensure other processors are initialized
        await sleep(10)
        await this.readinessWatcherFactoryService.waitUntilReady(BalanceProcessorService.name)
        await this.readinessWatcherFactoryService.waitUntilReady(OpenPositionProcessorService.name)
        await this.readinessWatcherFactoryService.waitUntilReady(ClosePositionProcessorService.name)
        await this.readinessWatcherFactoryService.waitUntilReady(DistributorProcessorService.name)
        this.logger.info(
            WinstonLog.ActiveBotProcessorInitialized, {
                botId: this.request.botId,
            }
        )
        this.eventEmitter.on(
            createEventName(
                EventName.UpdateActiveBot, {
                    botId: this.request.botId,
                }),
            async () => {
                await this.load()
            }
        )
        this.load()
        setInterval(() => {
            this.load()
        }, envConfig().botExecutor.activeBotInterval)
    }

    async load() {
        const bot = await this.connection
            .model<BotSchema>(BotSchema.name).findById(this.request.botId)
        if (!bot) {
            throw new BotNotFoundException(`Bot not found with id: ${this.request.botId}`)
        }
        const activePosition = await this.connection
            .model<PositionSchema>(PositionSchema.name).findOne({
                bot: bot.id,
                isActive: true,
            })  
        const botJson = bot.toJSON()
        botJson.activePosition = activePosition?.toJSON()
        this.bot = botJson
        this.emit()
    }

    emit() {
        this.eventEmitter.emit(
            createEventName(
                EventName.ActiveBotUpdated, {
                    botId: this.request.botId,
                }),
            this.bot,
        )
    }
}

export interface ActiveBotProcessorRequest {
    botId: string
}