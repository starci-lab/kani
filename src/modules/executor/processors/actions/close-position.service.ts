import { Inject, Injectable, Scope } from "@nestjs/common"
import { DlmmLiquidityPoolsFetchedEvent, EventName, LiquidityPoolsFetchedEvent } from "@modules/event"
import { REQUEST } from "@nestjs/core"
import { BotSchema, InjectPrimaryMongoose, PositionSchema, PrimaryMemoryStorageService } from "@modules/databases"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { Connection } from "mongoose"
import { BotNotFoundException, TokenNotFoundException } from "@exceptions"
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
        // register event listeners
        this.eventEmitter.on(
            EventName.InternalLiquidityPoolsFetched,
            async (
                payload: LiquidityPoolsFetchedEvent
            ) => {
                this.mutex = this.mutexService.mutex(
                    getMutexKey(
                        MutexKey.Action, 
                        this.request.bot.id
                    ))
                // re query the bot to ensure data is up to date
                const bot = await this.connection.model<BotSchema>(BotSchema.name).findById(this.request.bot.id)
                if (!bot) {
                    // bot not found, we skip here
                    throw new BotNotFoundException(`Bot not found with id: ${this.request.bot.id}`)
                }
                const activePosition = await this.connection
                    .model<PositionSchema>(PositionSchema.name).findOne({
                        bot: bot.id,
                        isActive: true,
                    })
                if (!activePosition) {
                    // we do nothing if the bot is not in a position
                    return
                }
                // only run if the liquidity pool is belong to the bot
                if (
                    !bot.liquidityPools
                        .map((liquidityPool) => liquidityPool.toString())
                        .includes(createObjectId(payload.liquidityPoolId).toString())
                )
                {
                    // skip if the liquidity pool is not belong to the bot
                    return
                }
                // define the target and quote tokens
                const targetToken = this.primaryMemoryStorageService.tokens.find(token => token.id === bot.targetToken.toString())
                if (!targetToken) {
                    throw new TokenNotFoundException("Target token not found")
                }
                const quoteToken = this.primaryMemoryStorageService.tokens.find(token => token.id === bot.quoteToken.toString())
                if (!quoteToken) {
                    throw new TokenNotFoundException("Quote token not found")
                }
                // run the open position
                if (this.mutex.isLocked()) {
                    return
                }
                await this.mutex.runExclusive(
                    async () => {
                        try {
                            return await this.dispatchClosePositionService.dispatchClosePosition({
                                liquidityPoolId: payload.liquidityPoolId,
                                bot: bot,
                            })
                        } catch (error) {
                            this.logger.error(
                                WinstonLog.ClosePositionFailed, {
                                    botId: bot.id,
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
                this.mutex = this.mutexService.mutex(
                    getMutexKey(
                        MutexKey.Action, 
                        this.request.bot.id
                    ))
                // re query the bot to ensure data is up to date
                const bot = await this.connection.model<BotSchema>(BotSchema.name).findById(this.request.bot.id)
                if (!bot) {
                    // bot not found, we skip here
                    throw new BotNotFoundException(`Bot not found with id: ${this.request.bot.id}`)
                }
                const activePosition = await this.connection
                    .model<PositionSchema>(PositionSchema.name).findOne({
                        bot: bot.id,
                        isActive: true,
                    })
                if (!activePosition) {
                    // we do nothing if the bot is not in a position
                    return
                }
                // only run if the liquidity pool is similar to the active position
                if (
                    activePosition.liquidityPool.toString() !== createObjectId(payload.liquidityPoolId).toString()
                ) {
                    // skip if the liquidity pool is not similar to the active position
                    return
                }
                // define the target and quote tokens
                const targetToken = this.primaryMemoryStorageService.tokens.find(token => token.id === bot.targetToken.toString())
                if (!targetToken) {
                    throw new TokenNotFoundException("Target token not found")
                }
                const quoteToken = this.primaryMemoryStorageService.tokens.find(token => token.id === bot.quoteToken.toString())
                if (!quoteToken) {
                    throw new TokenNotFoundException("Quote token not found")
                }
                // run the open position
                if (this.mutex.isLocked()) {
                    return
                }
                await this.mutex.runExclusive(
                    async () => {
                        try {
                            return await this.dispatchClosePositionService.dispatchClosePosition({
                                liquidityPoolId: payload.liquidityPoolId,
                                bot: bot,
                            })
                        } catch (error) {
                            this.logger.error(
                                WinstonLog.ClosePositionFailed, {
                                    botId: bot.id,
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