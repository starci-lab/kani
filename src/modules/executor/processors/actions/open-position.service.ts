import { Inject, Injectable, Scope } from "@nestjs/common"
import { 
    createEventName, 
    DlmmLiquidityPoolsFetchedEvent, 
    EventName, 
    LiquidityPoolsFetchedEvent 
} from "@modules/event"
import { REQUEST } from "@nestjs/core"
import { BotSchema, PrimaryMemoryStorageService, QuoteRatioStatus } from "@modules/databases"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { Connection } from "mongoose"
import { InjectPrimaryMongoose } from "@modules/databases"
import { TokenNotFoundException } from "@exceptions"
import { DispatchOpenPositionService, QuoteRatioService } from "@modules/blockchains"
import { MutexService } from "@modules/lock"
import { Mutex } from "async-mutex"
import { getMutexKey, MutexKey } from "@modules/lock"
import { createObjectId } from "@utils"
import { DayjsService, ReadinessWatcherFactoryService } from "@modules/mixin"
import { MsService } from "@modules/mixin"
import { OPEN_POSITION_INTERVAL, OPEN_POSITION_SNAPSHOT_INTERVAL } from "./constants"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import BN from "bn.js"
import Decimal from "decimal.js"
import { Dayjs } from "dayjs"

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
export class OpenPositionProcessorService  {
    private mutex: Mutex
    private bot: BotSchema
    private lastOpenedPositionAt: Dayjs | null = null
    constructor(
        // The request object injected into this processor. It contains
        // the `user` instance for whom the processor is running.
        @Inject(REQUEST)
        private readonly request: OpenPositionProcessorRequest,
        // Used to manually subscribe to events. We bind listeners here instead
        // of using @OnEvent so Nest doesn't override our request context.
        private readonly eventEmitter: EventEmitter2,
        // inject the connection to the database
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dispatchOpenPositionService: DispatchOpenPositionService,
        private readonly mutexService: MutexService,
        private readonly dayjsService: DayjsService,
        private readonly msService: MsService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly quoteRatioService: QuoteRatioService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) {}

    // Register event listeners for this processor instance.
    // This lets every user have their own isolated event handling logic.
    async initialize() {
        this.readinessWatcherFactoryService.createWatcher(OpenPositionProcessorService.name)
        // initialize the mutex
        this.mutex = this.mutexService.mutex(
            getMutexKey(
                MutexKey.Action, 
                this.request.botId
            ))
        this.eventEmitter.on(
            createEventName(
                EventName.ActiveBotUpdated, {
                    botId: this.request.botId,
                }),
            async (payload: BotSchema) => {
                this.bot = payload
            }
        )   
        this.eventEmitter.on(
            createEventName(
                EventName.PositionOpened, {
                    botId: this.request.botId,
                }),
            async () => {
                this.lastOpenedPositionAt = this.dayjsService.now()
            }
        )
        // register event listeners
        this.eventEmitter.on(
            createEventName(
                EventName.DistributedLiquidityPoolsFetched, {
                    botId: this.request.botId,
                }),
            async (payload: LiquidityPoolsFetchedEvent) => {
                if (!this.bot) {
                    return
                }
                // if the bot has been open position recently, we skip the open position
                if (
                    this.lastOpenedPositionAt 
                )
                {
                    if (this.lastOpenedPositionAt
                        .diff(this.dayjsService.now(), "millisecond") < 
                    this.msService.fromString(OPEN_POSITION_INTERVAL)) 
                    {
                        return
                    }
                }
                if (
                    !this.bot.snapshotTargetBalanceAmount 
                    || !this.bot.snapshotQuoteBalanceAmount
                    || !this.bot.snapshotGasBalanceAmount
                    || new Decimal(
                        this.dayjsService.now().diff(
                            this.bot.lastBalancesSnapshotAt, "millisecond")).gt(
                        new Decimal(
                            this.msService.fromString(OPEN_POSITION_SNAPSHOT_INTERVAL)
                        )
                    )
                ) {
                    return
                }
                // only run if the liquidity pool is belong to the bot
                if (
                    !this.bot.liquidityPools
                        .map((liquidityPool) => liquidityPool.toString())
                        .includes(createObjectId(payload.liquidityPoolId).toString())
                )
                {
                    // skip if the liquidity pool is not belong to the bot
                    return
                }
                // define the target and quote tokens
                const targetToken = this.primaryMemoryStorageService.tokens.find(
                    token => token.id === this.bot.targetToken.toString())
                if (!targetToken) {
                    throw new TokenNotFoundException("Target token not found")
                }
                const quoteToken = this.primaryMemoryStorageService.tokens.find(
                    token => token.id === this.bot.quoteToken.toString())
                if (!quoteToken) {
                    throw new TokenNotFoundException("Quote token not found")
                }
                const snapshotTargetBalanceAmountBN = new BN(this.bot.snapshotTargetBalanceAmount)
                const snapshotQuoteBalanceAmountBN = new BN(this.bot.snapshotQuoteBalanceAmount)
                // get the quote ratio, if the quote ratio is not good, we skip the open position
                const {
                    quoteRatio
                } = await this.quoteRatioService.computeQuoteRatio({
                    targetTokenId: targetToken.displayId,
                    quoteTokenId: quoteToken.displayId,
                    targetBalanceAmount: snapshotTargetBalanceAmountBN,
                    quoteBalanceAmount: snapshotQuoteBalanceAmountBN,
                })
                if (this.quoteRatioService.checkQuoteRatioStatus({
                    quoteRatio
                }) !== QuoteRatioStatus.Good) {
                    return
                }
                // run the open position
                if (this.mutex.isLocked()) {
                    return
                }
                await this.mutex.runExclusive(
                    async () => {
                        try {
                            return await this.dispatchOpenPositionService.dispatchOpenPosition({
                                liquidityPoolId: payload.liquidityPoolId,
                                bot: this.bot,
                            })
                        } catch (error) {
                            this.logger.error(
                                WinstonLog.OpenPositionFailed, {
                                    botId: this.bot.id,
                                    liquidityPoolId: payload.liquidityPoolId,
                                    error: error.message,
                                })
                        }
                    })
            }
        )
        this.eventEmitter.on(
            createEventName(
                EventName.DistributedDlmmLiquidityPoolsFetched, 
                {
                    botId: this.request.botId,
                }),
            async (payload: DlmmLiquidityPoolsFetchedEvent) => {
                if (!this.bot) {
                    return
                }
                // if the bot has been open position recently, we skip the open position
                if (
                    this.lastOpenedPositionAt &&
                    this.lastOpenedPositionAt.diff(this.dayjsService.now(), "millisecond") < 
                    this.msService.fromString(OPEN_POSITION_INTERVAL)
                ) 
                {
                    return
                }
                if (
                    !this.bot.snapshotTargetBalanceAmount 
                    || !this.bot.snapshotQuoteBalanceAmount
                    || !this.bot.snapshotGasBalanceAmount
                    || new Decimal(
                        this.dayjsService.now().diff(
                            this.bot.lastBalancesSnapshotAt, "millisecond")).gt(
                        new Decimal(
                            this.msService.fromString(OPEN_POSITION_SNAPSHOT_INTERVAL)
                        )
                    )
                ) {
                    return
                }
                if (
                    !this.bot.liquidityPools
                        .map((liquidityPool) => liquidityPool.toString())
                        .includes(createObjectId(payload.liquidityPoolId).toString())
                )
                {
                    // skip if the liquidity pool is not belong to the bot
                    return
                }
                // define the target and quote tokens
                const targetToken = this.primaryMemoryStorageService.tokens.find(
                    token => token.id === this.bot.targetToken.toString())
                if (!targetToken) {
                    throw new TokenNotFoundException("Target token not found")
                }
                const quoteToken = this.primaryMemoryStorageService.tokens.find(
                    token => token.id === this.bot.quoteToken.toString())
                if (!quoteToken) {
                    throw new TokenNotFoundException("Quote token not found")
                }
                const snapshotTargetBalanceAmountBN = new BN(this.bot.snapshotTargetBalanceAmount)
                const snapshotQuoteBalanceAmountBN = new BN(this.bot.snapshotQuoteBalanceAmount)
                // get the quote ratio, if the quote ratio is not good, we skip the open position
                const {
                    quoteRatio
                } = await this.quoteRatioService.computeQuoteRatio({
                    targetTokenId: targetToken.displayId,
                    quoteTokenId: quoteToken.displayId,
                    targetBalanceAmount: snapshotTargetBalanceAmountBN,
                    quoteBalanceAmount: snapshotQuoteBalanceAmountBN,
                })
                if (this.quoteRatioService.checkQuoteRatioStatus({
                    quoteRatio
                }) !== QuoteRatioStatus.Good) {
                    return
                }
                // run the open position
                if (this.mutex.isLocked()) {
                    return
                }
                await this.mutex.runExclusive(
                    async () => {
                        try {
                            return await this.dispatchOpenPositionService.dispatchOpenPosition({
                                liquidityPoolId: payload.liquidityPoolId,
                                bot: this.bot,
                            })
                        } catch (error) {
                            this.logger.error(
                                WinstonLog.OpenPositionFailed, {
                                    botId: this.bot.id,
                                    liquidityPoolId: payload.liquidityPoolId,
                                    error: error.message,
                                })
                        }
                    })
            }
        )
        this.readinessWatcherFactoryService.setReady(OpenPositionProcessorService.name)
    }
}

export interface OpenPositionProcessorRequest {
    botId: string
}