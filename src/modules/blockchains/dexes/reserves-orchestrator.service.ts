import { Inject, Injectable } from "@nestjs/common"
import {
    BotSchema,
    DexId,
    LiquidityPoolId,
    LiquidityPoolType,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    DexNotFoundException,
    DexNotImplementedException,
    LiquidityPoolNotFoundException,
    ActivePositionNotFoundException,
} from "@exceptions"
import { MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } from "./dexes.module-definition"
import {
    DlmmLiquidityPoolState,
    LiquidityPoolState,
    ReservesResponse,
} from "../interfaces"
import { OrcaReservesService } from "./orca"
import { LiquidityPoolStateService } from "./liquidity-pool-state.service"
import { MeteoraReservesService } from "./meteora"
import { RaydiumReservesService } from "./raydium"

/**
 * ReservesOrchestratorService
 *
 * High-level orchestration layer for calculating reserves.
 *
 * Responsibilities:
 * - Evaluate whether reserves SHOULD be calculated
 * - Validate liquidity pool and DEX support
 * - Calculate reserves
 */
@Injectable()
export class ReservesOrchestratorService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly orcaReservesService: OrcaReservesService,
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        private readonly meteoraReservesService: MeteoraReservesService,
        private readonly raydiumReservesService: RaydiumReservesService,
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
    ) { }
    /**
     * Execute on-chain fees transaction.
     */ 
    async reserves(
        {
            bot,
            liquidityPoolId,
        }: OrchestrateReservesParams,
    ): Promise<ReservesResponse> {
        const liquidityPool = this.primaryMemoryStorageService
            .liquidityPools
            .find(liquidityPool => liquidityPool.displayId === liquidityPoolId)
        if (!liquidityPool) throw new LiquidityPoolNotFoundException("Liquidity pool not found")
        let state: LiquidityPoolState | DlmmLiquidityPoolState
        if (liquidityPool.type === LiquidityPoolType.Dlmm) {
            state = await this.liquidityPoolStateService.getDlmmState(liquidityPoolId)
        } else {
            state = await this.liquidityPoolStateService.getState(liquidityPoolId)
        }
        const dex =
            this.primaryMemoryStorageService.dexes.find(
                dex => dex.id === state.static.dex.toString(),
            )
        if (!dex) throw new DexNotFoundException("Dex not found")
        if (!this.options.dexIds?.includes(dex.displayId)) {
            throw new DexNotImplementedException(
                `Dex ${state.static.dex.toString()} not supported`,
            )
        }
        if (!bot.activePosition) throw new ActivePositionNotFoundException("Active position not found")
        switch (dex.displayId) {
        case DexId.FlowX:
            throw new DexNotImplementedException("FlowX reserves not implemented")
        case DexId.Cetus:
            throw new DexNotImplementedException("Cetus reserves not implemented")
        case DexId.Turbos:
            throw new DexNotImplementedException("Turbos reserves not implemented")
        case DexId.Momentum:
            throw new DexNotImplementedException("Momentum reserves not implemented")
        case DexId.Raydium: {
            return await this.raydiumReservesService.reserves(
                { 
                    bot, 
                    liquidityPoolId, 
                    state 
                }
            )
        }
        case DexId.Orca: {
            return await this.orcaReservesService.reserves(
                { 
                    bot, 
                    liquidityPoolId, 
                    state 
                }
            )
        }
        case DexId.Meteora: {
            return await this.meteoraReservesService.reserves(
                { 
                    bot, 
                    liquidityPoolId, 
                    state 
                }
            )
        }
        default:
            throw new DexNotImplementedException(`DEX ${state.static.dex.toString()} not supported for execute`)
        }
    }   
}

export interface OrchestrateReservesParams {
    bot: BotSchema
    liquidityPoolId: LiquidityPoolId
}
