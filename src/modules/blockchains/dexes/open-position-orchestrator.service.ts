import { Inject, Injectable } from "@nestjs/common"
import { LiquidityPoolStateService } from "./liquidity-pool-state.service"
import {
    BotSchema,
    DexId,
    InjectPrimaryMongoose,
    JobSchema,
    JobStatus,
    JobType,
    LiquidityPoolId,
    LiquidityPoolType,
    PrimaryMemoryStorageService,
    QuoteRatioStatus
} from "@modules/databases"
import {
    DexNotFoundException,
    DexNotImplementedException,
    LiquidityPoolNotFoundException,
    TokenNotFoundException
} from "@exceptions"
import { RaydiumOpenPositionActionService } from "./raydium"
import { OrcaOpenPositionActionService } from "./orca"
import { MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } from "./dexes.module-definition"
import { MeteoraOpenPositionActionService } from "./meteora"
import { 
    ConfirmOpenPositionParams,
    ConfirmOpenPositionResponse,
    DlmmLiquidityPoolState, 
    ExecuteOpenPositionParams, 
    ExecuteOpenPositionResponse, 
    LiquidityPoolState, 
    PrepareOpenPositionParams, 
    PrepareOpenPositionResponse 
} from "../interfaces"
import { BN } from "bn.js"
import { QuoteRatioService } from "../math"
import { computeDenomination, createObjectId } from "@utils"
import Decimal from "decimal.js"
import { FlowXOpenPositionActionService } from "./flowx"
import { CacheKey, createCacheKey, InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import { CetusOpenPositionActionService } from "./cetus"
import { TurbosOpenPositionActionService } from "./turbos"
import { MomentumOpenPositionActionService } from "./momentum"
import dayjs from "dayjs"
import { InjectQueue } from "@nestjs/bullmq"
import { bullData, BullQueueName } from "@modules/bullmq"
import { Queue } from "bullmq"
import { OpenPositionPayload } from "../types"
import { envConfig } from "@modules/env"
import { v4 } from "uuid"
import { getMutexKey, MutexKey } from "@modules/lock"
import { MutexService } from "@modules/lock"
import { Connection } from "mongoose"
import { WinstonLog } from "@modules/winston"
import { InjectWinston } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
@Injectable()
export class OpenPositionOrchestratorService {
    constructor(
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly raydiumOpenPositionActionService: RaydiumOpenPositionActionService,
        private readonly orcaOpenPositionActionService: OrcaOpenPositionActionService,
        private readonly meteoraOpenPositionActionService: MeteoraOpenPositionActionService,
        private readonly quoteRatioService: QuoteRatioService,
        private readonly flowxOpenPositionActionService: FlowXOpenPositionActionService,
        private readonly cetusOpenPositionActionService: CetusOpenPositionActionService,
        private readonly turbosOpenPositionActionService: TurbosOpenPositionActionService,
        private readonly momentumOpenPositionActionService: MomentumOpenPositionActionService,
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        @InjectQueue(bullData[BullQueueName.OpenPosition].name)
        private readonly openPositionQueue: Queue<OpenPositionPayload>,
        private readonly mutexService: MutexService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) { }

    async enqueue(
        {
            liquidityPoolId,
            bot,
        }: EnqueueOpenPositionParams,
    ) {

        /**
         * Retrieve mutex to prevent concurrent actions on the same bot
         */
        const mutex = this.mutexService.mutex(
            getMutexKey(MutexKey.Action, bot.id),
        )
        // if the mutex is locked, skip the execution
        if (mutex.isLocked()) {
            return
        }
        /**
         * Skip job if:
         * - balance snapshot is missing
         * - or snapshot is outdated (older than configured interval)
         */
        if (
            !bot.snapshotTargetBalanceAmount ||
            !bot.snapshotQuoteBalanceAmount ||
            !bot.snapshotGasBalanceAmount ||
            new Decimal(
                dayjs().diff(bot.lastBalancesSnapshotAt, "millisecond"),
            ).gt(
                new Decimal(
                    envConfig().timeConfig.interval.balanceSnapshot,
                ),
            )
        ) {
            // Balance snapshot is not valid or not up to date
            return
        }
        /**
         * Retrieve target token from in-memory storage
         */
        const targetToken =
            this.primaryMemoryStorageService.tokens.find(
                token => token.id === bot.targetToken.toString(),
            )
        if (!targetToken) {
            throw new TokenNotFoundException("Target token not found")
        }

        /**
         * Retrieve quote token from in-memory storage
         */
        const quoteToken =
            this.primaryMemoryStorageService.tokens.find(
                token => token.id === bot.quoteToken.toString(),
            )
        if (!quoteToken) {
            throw new TokenNotFoundException("Quote token not found")
        }

        /**
         * Ensure the liquidity pool belongs to this bot
         */
        if (
            !bot.liquidityPools
                .map(liquidityPool => liquidityPool.toString())
                .includes(createObjectId(liquidityPoolId).toString())
        ) {
            // Liquidity pool is not associated with the bot
            return
        }
        /**
         * Convert snapshot balances to BN for precise arithmetic
         */
        const snapshotTargetBalanceAmountBN = new BN(
            bot.snapshotTargetBalanceAmount,
        )
        const snapshotQuoteBalanceAmountBN = new BN(
            bot.snapshotQuoteBalanceAmount,
        )
        /**
         * Compute quote ratio to determine if opening a position is favorable
         */
        const { quoteRatio } =
            await this.quoteRatioService.computeQuoteRatio(
                {
                    targetTokenId: targetToken.displayId,
                    quoteTokenId: quoteToken.displayId,
                    targetBalanceAmount: snapshotTargetBalanceAmountBN,
                    quoteBalanceAmount: snapshotQuoteBalanceAmountBN,
                }
            )
        /**
         * Skip opening position if quote ratio is not in a good state
         */
        if (
            this.quoteRatioService.checkQuoteRatioStatus(
                {
                    quoteRatio,
                }
            ) !== QuoteRatioStatus.Good
        ) {
            return
        }
        /**
         * Prevent duplicate open position transactions
         * (idempotency guard using cache)
         */
        if (
            await this.cacheManager.get(
                createCacheKey(
                    CacheKey.OpenPositionTransaction,
                    { botId: bot.id },
                ),
            )
        ) {
            return
        }
        /**
         * Retrieve liquidity pool definition from memory
         */
        const liquidityPool =
            this.primaryMemoryStorageService.liquidityPools.find(
                liquidityPool =>
                    liquidityPool.displayId === liquidityPoolId,
            )
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException(
                liquidityPoolId,
                `Liquidity pool ${liquidityPoolId} not found`,
            )
        }
        /**
         * Fetch latest liquidity pool state
         * (DLMM and non-DLMM pools have different state handlers)
         */
        let state: LiquidityPoolState | DlmmLiquidityPoolState
        if (liquidityPool.type === LiquidityPoolType.Dlmm) {
            state =
                await this.liquidityPoolStateService.getDlmmState(
                    liquidityPoolId,
                )
        } else {
            state =
                await this.liquidityPoolStateService.getState(
                    liquidityPoolId,
                )
        }
        /**
         * Validate that the pool's DEX exists
         */
        const dex =
            this.primaryMemoryStorageService.dexes.find(
                dex => dex.id === state.static.dex.toString(),
            )
        if (!dex) {
            throw new DexNotFoundException("Dex not found")
        }
        /**
         * Ensure the DEX is supported by current bot configuration
         */
        if (
            !this.options.dexes?.find(
                dex => dex.dexId === dex.dexId,
            )
        ) {
            throw new DexNotImplementedException(
                `Dex ${state.static.dex.toString()} not supported`,
            )
        }
        /**
         * Recompute quote ratio using snapshot balances
         * (used later for balance normalization)
         */
        const quoteRatioResponse =
            await this.quoteRatioService.computeQuoteRatio({
                targetTokenId: targetToken.displayId,
                quoteTokenId: quoteToken.displayId,
                targetBalanceAmount: new BN(
                    bot.snapshotTargetBalanceAmount || 0,
                ),
                quoteBalanceAmount: new BN(
                    bot.snapshotQuoteBalanceAmount || 0,
                ),
            })
        /**
         * Normalize balances into target token denomination
         */
        const targetBalanceAmount = new BN(
            bot.snapshotTargetBalanceAmount || 0,
        )
        const quoteBalanceAmount = new BN(
            bot.snapshotQuoteBalanceAmount || 0,
        )

        const targetBalanceAmountInTarget =
            computeDenomination(
                targetBalanceAmount,
                targetToken.decimals,
            )

        const quoteBalanceAmountInTarget =
            computeDenomination(
                quoteBalanceAmount,
                quoteToken.decimals,
            ).div(quoteRatioResponse.oraclePrice)

        /**
         * Total balance expressed in target token units
         */
        const totalBalanceAmountInTarget =
            targetBalanceAmountInTarget.add(
                quoteBalanceAmountInTarget,
            )
        /**
         * Safety check:
         * Ensure total balance meets minimum requirement to open a position
         */
        if (
            totalBalanceAmountInTarget.lt(
                new Decimal(
                    targetToken.minRequiredAmountInTotal || 0,
                ),
            )
        ) {
            // Insufficient balance to open a position
            return
        }
        // acquire the mutex
        const releaser = await mutex.acquire()
        // set a timeout to release the mutex after the cooldown period
        setTimeout(
            async () => {
                releaser()
            },
            envConfig().timeConfig.interval.mutex
        )
        // create the job
        const [jobRaw] = await this.connection.model<JobSchema>(
            JobSchema.name
        ).create(
            [
                {
                    liquidityPool: liquidityPool.id,
                    botId: bot.id,
                    type: JobType.OpenPosition,
                    status: JobStatus.Pending,
                }
            ])
        // add the open position job to the queue
        await this.openPositionQueue.add(
            v4(),
            {
                jobId: jobRaw.toJSON().id,
                state,
                bot,
            }
        )
        // log the event
        this.logger.verbose(
            WinstonLog.OpenPositionEnqueued,
            {
                botId: bot.id,
                liquidityPoolId,
            }
        )
    }

    async prepare(
        {
            state,
            bot,
        }: PrepareOpenPositionParams,
    ): Promise<PrepareOpenPositionResponse> {
        const _state = state as LiquidityPoolState | DlmmLiquidityPoolState
        // retrieve the dex
        const dex = this.primaryMemoryStorageService.dexes.find(dex => dex.id === _state.static.dex.toString())
        if (!dex) throw new DexNotFoundException("Dex not found")
        if (!this.options.dexes?.find(dex => dex.dexId === dex.dexId)) {
            throw new DexNotImplementedException(`Dex ${_state.static.dex.toString()} not supported`)
        }
        // run the open position action
        switch (dex.displayId) {
        case DexId.Raydium: {
            return await this.raydiumOpenPositionActionService.prepare({
                state: _state,
                bot,
            })
        }
        case DexId.Orca: {
            return await this.orcaOpenPositionActionService.prepare({
                state: _state,
                bot,
            })
        }
        case DexId.Meteora: {
            return await this.meteoraOpenPositionActionService.prepare({
                state: _state,
                bot,
            })
        }
        case DexId.FlowX: {
            return await this.flowxOpenPositionActionService.prepare({
                state,
                bot,
            })
        }
        case DexId.Cetus: {
            return await this.cetusOpenPositionActionService.prepare({
                state,
                bot,
            })
        }
        case DexId.Turbos: {
            return await this.turbosOpenPositionActionService.prepare({
                state: _state,
                bot,
            })
        }
        case DexId.Momentum: {
            return await this.momentumOpenPositionActionService.prepare({
                state: _state,
                bot,
            })
        }
        default: {
            throw new DexNotImplementedException(`DEX ${_state.static.dex.toString()} not supported`)
        }
        }
    }

    async execute(
        params: ExecuteOpenPositionParams,
    ): Promise<ExecuteOpenPositionResponse> {
        const { state } = params
        const _state = state as LiquidityPoolState | DlmmLiquidityPoolState
        const dex = this.primaryMemoryStorageService.dexes.find(dex => dex.id === _state.static.dex.toString())
        if (!dex) throw new DexNotFoundException("Dex not found")
        if (!this.options.dexes?.find(dex => dex.dexId === dex.dexId)) {
            throw new DexNotImplementedException(`Dex ${_state.static.dex.toString()} not supported`)
        }
        switch (dex.displayId) {
        case DexId.FlowX: {
            return await this.flowxOpenPositionActionService.execute(params)
        }
        case DexId.Cetus: {
            return await this.cetusOpenPositionActionService.execute(params)
        }
        case DexId.Turbos: {
            return await this.turbosOpenPositionActionService.execute(params)
        }
        case DexId.Momentum: {
            return await this.momentumOpenPositionActionService.execute(params)
        }
        case DexId.Raydium: {
            return await this.raydiumOpenPositionActionService.execute(params)
        }
        case DexId.Orca: {
            return await this.orcaOpenPositionActionService.execute(params)
        }
        case DexId.Meteora: {
            return await this.meteoraOpenPositionActionService.execute(params)
        }
        default: {
            throw new DexNotImplementedException(`DEX ${_state.static.dex.toString()} not supported for execute`)
        }
        }
    }

    async confirm(
        params: ConfirmOpenPositionParams,
    ): Promise<ConfirmOpenPositionResponse> {
        const { state } = params
        const _state = state as LiquidityPoolState | DlmmLiquidityPoolState
        const dex = this.primaryMemoryStorageService.dexes.find(dex => dex.id === _state.static.dex.toString())
        if (!dex) throw new DexNotFoundException("Dex not found")
        if (!this.options.dexes?.find(dex => dex.dexId === dex.dexId)) {
            throw new DexNotImplementedException(`Dex ${_state.static.dex.toString()} not supported`)
        }
        switch (dex.displayId) {
        case DexId.FlowX: {
            return await this.flowxOpenPositionActionService.confirm(params)
        }
        case DexId.Cetus: {
            return await this.cetusOpenPositionActionService.confirm(params)
        }
        case DexId.Turbos: {
            return await this.turbosOpenPositionActionService.confirm(params)
        }
        case DexId.Momentum: {
            return await this.momentumOpenPositionActionService.confirm(params)
        }
        case DexId.Raydium: {
            return await this.raydiumOpenPositionActionService.confirm(params)
        }
        case DexId.Orca: {
            return await this.orcaOpenPositionActionService.confirm(params)
        }
        case DexId.Meteora: {
            return await this.meteoraOpenPositionActionService.confirm(params)
        }
        default: {
            throw new DexNotImplementedException(`DEX ${_state.static.dex.toString()} not supported for confirm`)
        }
        }
    }
}

export interface EnqueueOpenPositionParams {
    bot: BotSchema
    liquidityPoolId: LiquidityPoolId
}