import { Inject, Injectable } from "@nestjs/common"
import { LiquidityPoolStateService } from "./liquidity-pool-state.service"
import { BotSchema, DexId, InjectPrimaryMongoose, JobSchema, JobStatus, JobType, LiquidityPoolId, LiquidityPoolType, PrimaryMemoryStorageService } from "@modules/databases"
import { DexNotFoundException, DexNotImplementedException, LiquidityPoolNotFoundException } from "@exceptions"
import { RaydiumClosePositionActionService } from "./raydium"
import { OrcaClosePositionActionService } from "./orca"
import { MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } from "./dexes.module-definition"
import { MeteoraClosePositionActionService } from "./meteora"
import { DlmmLiquidityPoolState, LiquidityPoolState } from "../interfaces"
import { FlowXClosePositionActionService } from "./flowx"
import { CetusClosePositionActionService } from "./cetus"
import { TurbosClosePositionActionService } from "./turbos"
import { MomentumClosePositionActionService } from "./momentum"
import { PrepareClosePositionParams, PrepareClosePositionResponse, ExecuteClosePositionParams as ExecuteClosePositionParamsInterface } from "../interfaces"
import { createObjectId } from "@utils"
import { InjectQueue } from "@nestjs/bullmq"
import { bullData, BullQueueName } from "@modules/bullmq"
import { Queue } from "bullmq"
import { ClosePositionPayload } from "../types"
import { v4 } from "uuid"
import { getMutexKey, MutexKey, MutexService } from "@modules/lock"
import { Connection } from "mongoose"
import { envConfig } from "@modules/env"
import { ExitStrategyEngineOutputService } from "../exit-strategy-engine"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"

@Injectable()
export class ClosePositionOrchestratorService {
    constructor(
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly raydiumClosePositionActionService: RaydiumClosePositionActionService,
        private readonly orcaClosePositionActionService: OrcaClosePositionActionService,
        private readonly meteoraClosePositionActionService: MeteoraClosePositionActionService,
        private readonly flowXClosePositionActionService: FlowXClosePositionActionService,
        private readonly cetusClosePositionActionService: CetusClosePositionActionService,
        private readonly turbosClosePositionActionService: TurbosClosePositionActionService,
        private readonly momentumClosePositionActionService: MomentumClosePositionActionService,
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        @InjectQueue(bullData[BullQueueName.ClosePosition].name)
        private readonly closePositionQueue: Queue<ClosePositionPayload>,
        private readonly mutexService: MutexService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly exitStrategyEngineOutputService: ExitStrategyEngineOutputService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) {}

    async enqueue(
        {
            liquidityPoolId,
            bot,
        }: EnqueueClosePositionParams,
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
         * Safety check, if the active position is not set, return and remind user to open a position first
         */
        if (!bot.activePosition) {
            return
        }
        /**
         * Check if current liquidity pool is belong to the active position
         */
        if (bot.activePosition.liquidityPool.toString() !== createObjectId(liquidityPoolId).toString()) {
            return
        }
        /**
         * Retrieve the liquidity pool
         */
        const liquidityPool = this.primaryMemoryStorageService.liquidityPools.find(
            liquidityPool => liquidityPool.displayId === liquidityPoolId,
        )
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException(liquidityPoolId, `Liquidity pool ${liquidityPoolId} not found`)
        }
        /**
         * Fetch latest liquidity pool state
         * (DLMM and non-DLMM pools have different state handlers)
         */
        let state: LiquidityPoolState | DlmmLiquidityPoolState
        if (liquidityPool.type === LiquidityPoolType.Dlmm) {
            state = await this.liquidityPoolStateService.getDlmmState(liquidityPoolId)
        } else {
            state = await this.liquidityPoolStateService.getState(liquidityPoolId)
        }
        /**
         * Validate that the pool's DEX exists
         */
        const dex = this.primaryMemoryStorageService.dexes.find(dex => dex.id === state.static.dex.toString())
        if (!dex) {
            throw new DexNotFoundException("Dex not found")
        }   
        /**
         * Ensure the DEX is supported by current bot configuration
         */
        if (!this.options.dexes?.find(dex => dex.dexId === dex.dexId)) {
            throw new DexNotImplementedException(`Dex ${state.static.dex.toString()} not supported`)
        }
        /**
         * Check if the position can be closed
         */
        const { willExit, reasons } = await this.exitStrategyEngineOutputService.willExit({
            bot,
            state,
        })
        if (willExit) {
            this.logger.verbose(
                WinstonLog.ClosePositionNotExitable, {
                    botId: bot.id,
                    liquidityPoolId,
                    reasons,
                }
            )
            return
        }
        /* 
         * Lock the mutex to prevent concurrent actions on the same bot
         */
        const releaser = await mutex.acquire()
        setTimeout(
            releaser, 
            envConfig().timeConfig.interval.mutex
        )
        /**
         * Add close position job to the queue
         */
        const [ jobRaw ] = await this.connection.model<JobSchema>(
            JobSchema.name
        ).create(
            [
                {
                    liquidityPool: liquidityPool.id,
                    botId: bot.id,
                    type: JobType.ClosePosition,
                    status: JobStatus.Pending,
                }
            ])
        await this.closePositionQueue.add(
            v4(),
            {
                jobId: jobRaw.toJSON().id,
                state,
                bot,
            }
        )
        this.logger.verbose(
            WinstonLog.ClosePositionEnqueued, {
                botId: bot.id,
                jobId: jobRaw.toJSON().id,
                liquidityPoolId,
            }
        )
    }

    async prepare(
        {
            bot,
            state,
        }: PrepareClosePositionParams,
    ): Promise<PrepareClosePositionResponse> {
        const _state = state as LiquidityPoolState | DlmmLiquidityPoolState
        const dex = this.primaryMemoryStorageService.dexes.find(dex => dex.id === _state.static.dex.toString())
        if (!dex) throw new DexNotFoundException("Dex not found")
        if (!this.options.dexes?.find(dex => dex.dexId === dex.dexId)) {
            throw new DexNotImplementedException(`Dex ${_state.static.dex.toString()} not supported`)
        }
        switch (dex.displayId) {
        case DexId.FlowX: {
            return await this.flowXClosePositionActionService.prepare({
                state: _state,
                bot,
            })
        }
        case DexId.Cetus: {
            return await this.cetusClosePositionActionService.prepare({
                state: _state,
                bot,
            })
        }
        case DexId.Turbos: {
            return await this.turbosClosePositionActionService.prepare({
                state: _state,
                bot,
            })
        }
        case DexId.Momentum: {
            return await this.momentumClosePositionActionService.prepare({
                state: _state,
                bot,
            })
        }
        case DexId.Raydium: {
            return await this.raydiumClosePositionActionService.prepare({
                state: _state,
                bot,
            })
        }
        case DexId.Orca: {
            return await this.orcaClosePositionActionService.prepare({
                state: _state,
                bot,
            })
        }
        case DexId.Meteora: {
            return await this.meteoraClosePositionActionService.prepare({
                state: _state,
                bot,
            })
        }
        default: {
            throw new DexNotImplementedException(`DEX ${_state.static.dex.toString()} not supported for prepare`)
        }
        }
    }

    async execute(
        params: ExecuteClosePositionParamsInterface,
    ): Promise<void> {
        const { state } = params
        const _state = state as LiquidityPoolState | DlmmLiquidityPoolState
        const dex = this.primaryMemoryStorageService.dexes.find(dex => dex.id === _state.static.dex.toString())
        if (!dex) throw new DexNotFoundException("Dex not found")
        if (!this.options.dexes?.find(dex => dex.dexId === dex.dexId)) {
            throw new DexNotImplementedException(`Dex ${_state.static.dex.toString()} not supported`)
        }
        switch (dex.displayId) {
        case DexId.Raydium: {
            return await this.raydiumClosePositionActionService.execute(params)
        }
        case DexId.Orca: {
            return await this.orcaClosePositionActionService.execute(params)
        }
        case DexId.Meteora: {
            return await this.meteoraClosePositionActionService.execute(params)
        }
        case DexId.FlowX: {
            return await this.flowXClosePositionActionService.execute(params)
        }
        case DexId.Cetus: {
            return await this.cetusClosePositionActionService.execute(params)
        }
        case DexId.Turbos: {
            return await this.turbosClosePositionActionService.execute(params)
        }
        case DexId.Momentum: {
            return await this.momentumClosePositionActionService.execute(params)
        }
        default: {
            throw new DexNotImplementedException(`DEX ${_state.static.dex.toString()} not supported`)
        }
        }
    }
}

export interface EnqueueClosePositionParams {
    bot: BotSchema
    liquidityPoolId: LiquidityPoolId
}

export interface ExecuteClosePositionOrchestratorParams {
    liquidityPoolId: LiquidityPoolId
    bot: BotSchema
}