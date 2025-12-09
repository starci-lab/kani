import { Inject, Injectable } from "@nestjs/common"
import { LiquidityPoolStateService } from "./liquidity-pool-state.service"
import { BotSchema, DexId, LiquidityPoolId, LiquidityPoolType, PrimaryMemoryStorageService } from "@modules/databases"
import { DexNotFoundException, DexNotImplementedException, LiquidityPoolNotFoundException } from "@exceptions"
import { RaydiumActionService } from "./raydium"
import { OrcaActionService } from "./orca"
import { MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } from "./dexes.module-definition"
import { MeteoraActionService } from "./meteora"
import { DlmmLiquidityPoolState, LiquidityPoolState } from "../interfaces"
import { getMutexKey, MutexKey, MutexService } from "@modules/lock"
import { FlowXActionService } from "./flowx"
import { CetusActionService } from "./cetus"
import { TurbosActionService } from "./turbos"
import { MomentumActionService } from "./momentum"
import { WinstonLog } from "@modules/winston"
import { InjectWinston } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { createObjectId } from "@utils"

@Injectable()
export class DispatchClosePositionService {
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
        private readonly mutexService: MutexService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) {}

    async dispatchClosePosition(
        {
            liquidityPoolId,
            bot,
        }: DispatchClosePositionParams,
    ) {
        // Retrieve the liquidity pool
        const liquidityPool = this.primaryMemoryStorageService.liquidityPools.find(
            liquidityPool => liquidityPool.displayId === liquidityPoolId,
        )
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException(liquidityPoolId, `Liquidity pool ${liquidityPoolId} not found`)
        }
        let state: LiquidityPoolState | DlmmLiquidityPoolState
        if (liquidityPool.type === LiquidityPoolType.Dlmm) {
            state = await this.liquidityPoolStateService.getDlmmState(liquidityPoolId)
        } else {
            state = await this.liquidityPoolStateService.getState(liquidityPoolId)
        }
        const dex = this.primaryMemoryStorageService.dexes.find(dex => dex.id === state.static.dex.toString())
        if (!dex) throw new DexNotFoundException("Dex not found")
        if (!this.options.dexes?.find(dex => dex.dexId === dex.dexId)) {
            throw new DexNotImplementedException(`Dex ${state.static.dex.toString()} not supported`)
        }
        // safety check, if the active position is not set, return and remind user to open a position first
        if (!bot.activePosition) {
            return
        }
        // check if current liquidity pool is belong to the active position
        if (bot.activePosition.liquidityPool.toString() !== createObjectId(liquidityPoolId).toString()) {
            return
        }
        // Retrieve the mutex for the bot
        const mutex = this.mutexService.mutex(getMutexKey(MutexKey.Action, bot.id))
        // if the mutex is locked, skip the execution
        if (mutex.isLocked()) {
            console.log("mutex is locked, skipping close position")
            return
        }
        // acquire the mutex lock
        await mutex.acquire()
        try {
            console.log("dispatching close position for bot", bot.id, "liquidity pool", liquidityPoolId)
            // run the close position action under mutex lock
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
        } catch (error) {
            mutex.release()
            this.logger.error(
                WinstonLog.ClosePositionFailed, {
                    botId: bot.id,
                    error: error.message,
                    stack: error.stack,
                })
        }
    }
}

export interface DispatchClosePositionParams {
    bot: BotSchema
    liquidityPoolId: LiquidityPoolId
}