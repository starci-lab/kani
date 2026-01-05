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
    FeesResponse,
    LiquidityPoolState,
} from "../interfaces"
import { OrcaFeesService } from "./orca"
import { LiquidityPoolStateService } from "./liquidity-pool-state.service"
import { MeteoraFeesService } from "./meteora"
import { RaydiumFeesService } from "./raydium"

/**
 * FeesOrchestratorService
 *
 * High-level orchestration layer for calculating fees.
 *
 * Responsibilities:
 * - Evaluate whether fees SHOULD be calculated
 * - Validate liquidity pool and DEX support
 * - Calculate fees
 */
@Injectable()
export class FeesOrchestratorService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly orcaFeesService: OrcaFeesService,
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        private readonly meteoraFeesService: MeteoraFeesService,
        private readonly raydiumFeesService: RaydiumFeesService,
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
    ) { }
    /**
     * Execute on-chain fees transaction.
     */ 
    async fees(
        {
            bot,
            liquidityPoolId,
        }: OrchestrateFeesParams,
    ): Promise<FeesResponse> {
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
            throw new DexNotImplementedException("FlowX fees not implemented")
        case DexId.Cetus:
            throw new DexNotImplementedException("Cetus fees not implemented")
        case DexId.Turbos:
            throw new DexNotImplementedException("Turbos fees not implemented")
        case DexId.Momentum:
            throw new DexNotImplementedException("Momentum fees not implemented")
        case DexId.Raydium: {
            return await this.raydiumFeesService.fees(
                { 
                    bot, 
                    liquidityPoolId, 
                    state 
                }
            )
        }
        case DexId.Orca: {
            return await this.orcaFeesService.fees(
                { 
                    bot, 
                    liquidityPoolId, 
                    state 
                }
            )
        }
        case DexId.Meteora: {
            return await this.meteoraFeesService.fees(
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

export interface OrchestrateFeesParams {
    bot: BotSchema
    liquidityPoolId: LiquidityPoolId
}
