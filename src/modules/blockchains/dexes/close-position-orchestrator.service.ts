import { Inject, Injectable } from "@nestjs/common"
import { LiquidityPoolStateService } from "./liquidity-pool-state.service"
import { BotSchema, DexId, LiquidityPoolId, LiquidityPoolType, PrimaryMemoryStorageService } from "@modules/databases"
import { DexNotFoundException, DexNotImplementedException, LiquidityPoolNotFoundException } from "@exceptions"
import { RaydiumActionService } from "./raydium"
import { OrcaActionService } from "./orca"
import { MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } from "./dexes.module-definition"
import { MeteoraActionService } from "./meteora"
import { DlmmLiquidityPoolState, LiquidityPoolState } from "../interfaces"
import { FlowXActionService } from "./flowx"
import { CetusActionService } from "./cetus"
import { TurbosActionService } from "./turbos"
import { MomentumActionService } from "./momentum"  
import { createObjectId } from "@utils"
import { InjectQueue } from "@nestjs/bullmq"
import { bullData, BullQueueName } from "@modules/bullmq"
import { Queue } from "bullmq"
import { ClosePositionPayload } from "../types"
import { v4 } from "uuid"
import { getMutexKey, MutexKey, MutexService } from "@modules/lock"

@Injectable()
export class ClosePositionOrchestratorService {
    constructor(
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly raydiumActionService: RaydiumActionService,
        private readonly orcaActionService: OrcaActionService,
        private readonly meteoraActionService: MeteoraActionService,
        private readonly flowXActionService: FlowXActionService,
        private readonly cetusActionService: CetusActionService,
        private readonly turbosActionService: TurbosActionService,
        private readonly momentumActionService: MomentumActionService,
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        @InjectQueue(bullData[BullQueueName.ClosePosition].name)
        private readonly closePositionQueue: Queue<ClosePositionPayload>,
        private readonly mutexService: MutexService,
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
         * Add close position job to the queue
         */
        this.closePositionQueue.add(
            v4(),
            {
                liquidityPoolId,
                bot,
            }
        )
    }

    async execute(
        {
            liquidityPoolId,
            bot,
        }: ExecuteClosePositionParams,
    ) {
        // retrieve the liquidity pool
        const liquidityPool = this.primaryMemoryStorageService.liquidityPools.find(
            liquidityPool => liquidityPool.displayId === liquidityPoolId,
        )
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException(liquidityPoolId, `Liquidity pool ${liquidityPoolId} not found`)
        }
        // retrieve the state
        let state: LiquidityPoolState | DlmmLiquidityPoolState
        if (liquidityPool.type === LiquidityPoolType.Dlmm) {
            state = await this.liquidityPoolStateService.getDlmmState(liquidityPoolId)
        } else {
            state = await this.liquidityPoolStateService.getState(liquidityPoolId)
        }
        // retrieve the dex
        const dex = this.primaryMemoryStorageService.dexes.find(dex => dex.id === state.static.dex.toString())
        if (!dex) throw new DexNotFoundException("Dex not found")
        if (!this.options.dexes?.find(dex => dex.dexId === dex.dexId)) {
            throw new DexNotImplementedException(`Dex ${state.static.dex.toString()} not supported`)
        }
        // run the close position action
        switch (dex.displayId) {
        case DexId.Raydium: {
            return await this.raydiumActionService.closePosition({
                state,
                bot,
            })
        }
        case DexId.Orca: {
            return await this.orcaActionService.closePosition({
                state,
                bot,
            })
        }
        case DexId.Meteora: {
            return await this.meteoraActionService.closePosition({
                state,
                bot,
            })
        }
        case DexId.FlowX: {
            return await this.flowXActionService.closePosition({
                state,
                bot,
            })
        }
        case DexId.Cetus: {
            return await this.cetusActionService.closePosition({
                state,
                bot,
            })
        }
        case DexId.Turbos: {
            return await this.turbosActionService.closePosition({
                state,
                bot,
            })
        }
        case DexId.Momentum: {
            return await this.momentumActionService.closePosition({
                state,
                bot,
            })
        }
        default: {
            throw new DexNotImplementedException(`DEX ${state.static.dex.toString()} not supported`)
        }
        }
    }
}

export interface EnqueueClosePositionParams {
    bot: BotSchema
    liquidityPoolId: LiquidityPoolId
}

export interface ExecuteClosePositionParams {
    liquidityPoolId: LiquidityPoolId
    bot: BotSchema
}