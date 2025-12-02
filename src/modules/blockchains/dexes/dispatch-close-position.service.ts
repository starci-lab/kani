import { Inject, Injectable } from "@nestjs/common"
import { LiquidityPoolStateService } from "./liquidity-pool-state.service"
import { BotSchema, DexId, LiquidityPoolId, LiquidityPoolType, PrimaryMemoryStorageService } from "@modules/databases"
import { DexNotFoundException, DexNotImplementedException, LiquidityPoolNotFoundException } from "@exceptions"
import { RaydiumActionService } from "./raydium"
import { OrcaActionService } from "./orca"
import { MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } from "./dexes.module-definition"
import { MeteoraActionService } from "./meteora"
import { DlmmLiquidityPoolState, LiquidityPoolState } from "../interfaces"

@Injectable()
export class DispatchClosePositionService {
    constructor(
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly raydiumActionService: RaydiumActionService,
        private readonly orcaActionService: OrcaActionService,
        private readonly meteoraActionService: MeteoraActionService,
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
    ) {}

    async dispatchClosePosition(
        {
            liquidityPoolId,
            bot,
        }: DispatchClosePositionParams,
    ) {
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
        switch (dex.displayId) {
        case DexId.Raydium:
            return this.raydiumActionService.closePosition({
                state,
                bot,
            })
        case DexId.Orca:
            return this.orcaActionService.closePosition({
                state,
                bot,
            })
        case DexId.Meteora:
            return this.meteoraActionService.closePosition({
                state,
                bot,
            })
        default:
            throw new Error(`DEX ${state.static.dex.toString()} not supported`)
        }
    }
}

export interface DispatchClosePositionParams {
    bot: BotSchema
    liquidityPoolId: LiquidityPoolId
}