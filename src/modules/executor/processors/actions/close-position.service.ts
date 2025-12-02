import { Inject, Injectable, Scope } from "@nestjs/common"
import { createEventName, DlmmLiquidityPoolsFetchedEvent, EventName, LiquidityPoolsFetchedEvent } from "@modules/event"
import { REQUEST } from "@nestjs/core"
import { 
    BotSchema, 
    InjectPrimaryMongoose, 
    PositionSchema, 
    PrimaryMemoryStorageService 
} from "@modules/databases"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { Connection } from "mongoose"
import { DispatchClosePositionService } from "@modules/blockchains"
import { createObjectId } from "@utils"
import { getMutexKey, MutexKey, MutexService } from "@modules/lock"
import { Mutex } from "async-mutex"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"

// open position processor service is to process the open position of the liquidity pools
// to determine if a liquidity pool is eligible to open a position
// OpenPositionProcessorService
// This class handles all logic related to opening positions for a specific user.
// It runs inside its own request-scoped DI context so each processor instance
// gets its own `bot` state. Using `durable: true` allows Nest to reuse this
// processor across events that belong to the same logical bot context”.

@Injectable({
    scope: Scope.REQUEST,
    durable: true,
})
export class ClosePositionProcessorService {
    private activeBot: BotSchema
    private mutex: Mutex
    constructor(
        // The request object injected into this processor. It contains
        // the `user` instance for whom the processor is running.
        @Inject(REQUEST)
        private readonly request: ClosePositionProcessorRequest,

        // Used to manually subscribe to events. We bind listeners here instead
        // of using @OnEvent so Nest doesn't override our request context.
        private readonly eventEmitter: EventEmitter2,
        // inject the connection to the database
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dispatchClosePositionService: DispatchClosePositionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly mutexService: MutexService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) {}

    // Register event listeners for this processor instance.
    // This lets every user have their own isolated event handling logic.
    async initialize() {
        // first time the instance is initialized, we query the bot to ensure data is up to date
        const bot = await this.connection.model<BotSchema>(BotSchema.name).findById(this.request.bot.id)
        if (bot) {
            this.activeBot = bot.toJSON()
            const activePosition = await this.connection
                .model<PositionSchema>(PositionSchema.name).findOne({
                    bot: bot.id,
                    isActive: true,
                })
            if (activePosition) {
                this.activeBot.activePosition = activePosition.toJSON()
            }
        }
        // whenever the active bot is updated, we update the active bot instance
        this.eventEmitter.on(
            createEventName(
                EventName.UpdateActiveBot, 
                {
                    botId: this.request.bot.id,
                }
            ),
            async (payload: BotSchema) => {
                this.activeBot = payload
            }
        )
        // register event listeners
        this.eventEmitter.on(
            EventName.InternalLiquidityPoolsFetched,
            async (
                payload: LiquidityPoolsFetchedEvent
            ) => {
                if (!this.activeBot) {
                    return
                }
                // only run if the liquidity pool is belong to the bot
                if (
                    this.activeBot.activePosition?.liquidityPool.toString() 
                    !== createObjectId(payload.liquidityPoolId).toString()
                )
                {
                    // skip if the liquidity pool is not belong to the active position
                    return
                }
                this.mutex = this.mutexService.mutex(
                    getMutexKey(
                        MutexKey.Action, 
                        this.request.bot.id
                    )
                )
                // run the open position
                if (this.mutex.isLocked()) {
                    return
                }
                await this.mutex.runExclusive(
                    async () => {
                        try {
                            return await this.dispatchClosePositionService.dispatchClosePosition({
                                liquidityPoolId: payload.liquidityPoolId,
                                bot: this.activeBot,
                            })
                        } catch (error) {
                            this.logger.error(
                                WinstonLog.ClosePositionFailed, {
                                    botId: this.request.bot.id,
                                    liquidityPoolId: payload.liquidityPoolId,
                                    error: error.message,
                                })
                        }
                    })
            }
        )
        this.eventEmitter.on(
            EventName.InternalDlmmLiquidityPoolsFetched,
            async (
                payload: DlmmLiquidityPoolsFetchedEvent
            ) => {
                if (!this.activeBot) {
                    return
                }
                this.mutex = this.mutexService.mutex(
                    getMutexKey(
                        MutexKey.Action, 
                        this.request.bot.id
                    ))
                // define the target and quote tokens
                if (this.mutex.isLocked()) {
                    return
                }
                await this.mutex.runExclusive(
                    async () => {
                        try {
                            return await this.dispatchClosePositionService.dispatchClosePosition({
                                liquidityPoolId: payload.liquidityPoolId,
                                bot: this.activeBot,
                            })
                        } catch (error) {
                            this.logger.error(
                                WinstonLog.ClosePositionFailed, {
                                    botId: this.activeBot.id,
                                    liquidityPoolId: payload.liquidityPoolId,
                                    error: error.message,
                                })
                        }
                    })
            }
        )
    }
}

export interface ClosePositionProcessorRequest {
    bot: BotSchema
}