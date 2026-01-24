import {
    Inject, Injectable 
} from "@nestjs/common"
import {
    BotSchema,
    DexId,
    LiquidityPoolSchema,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    DexNotFoundException,
    DexNotImplementedException,
    ActivePositionNotFoundException,
} from "@modules/exceptions"
import {
    MODULE_OPTIONS_TOKEN, OPTIONS_TYPE 
} from "./dexes.module-definition"
import {
    ReservesResult,
} from "../interfaces"
import {
    OrcaReservesService 
} from "./orca"
import {
    MeteoraReservesService 
} from "./meteora"
import {
    RaydiumReservesService 
} from "./raydium"
import {
    FlowXReservesService 
} from "./flowx"
import {
    LiquidityPoolStateService 
} from "./liquidity-pool-state.service"
import {
    CetusReservesService 
} from "./cetus"
import {
    TurbosReservesService 
} from "./turbos"
import {
    MomentumReservesService 
} from "./momentum"

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
        private readonly meteoraReservesService: MeteoraReservesService,
        private readonly raydiumReservesService: RaydiumReservesService,
        private readonly flowxReservesService: FlowXReservesService,
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        private readonly cetusReservesService: CetusReservesService,
        private readonly turbosReservesService: TurbosReservesService,
        private readonly momentumReservesService: MomentumReservesService,
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
    ) { }
    /**
     * Execute on-chain fees transaction.
     */ 
    async reserves(
        {
            bot,
            liquidityPool,
        }: OrchestrateReservesParams,
    ): Promise<ReservesResult> {
        // Stage: state/config validation (DEX must exist and be enabled)
        const dex =
            this.primaryMemoryStorageService.dexCollection.findOne(
                {
                    id: {
                        $eq: liquidityPool.dex.toString(),
                    },
                }
            )
        if (!dex) {
            throw new DexNotFoundException({
                id: liquidityPool.dex.toString(),
            })
        }
        if (!this.options.dexIds?.includes(dex.displayId)) {
            throw new DexNotImplementedException(
                {
                    id: liquidityPool.dex.toString(),
                }
            )
        }
        // Stage: state validation (reserves require an active position)
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        // Stage: on-chain/data fetch (load latest pool state from cache/on-chain sources)
        const state = await this.liquidityPoolStateService.getState(liquidityPool)
        switch (dex.displayId) {
        case DexId.FlowX:
        {
            return await this.flowxReservesService.reserves(
                { 
                    bot, 
                    state 
                }
            )
        }
        case DexId.Cetus:
        {
            return await this.cetusReservesService.reserves(
                { 
                    bot, 
                    state 
                }
            )
        }
        case DexId.Turbos:
        {
            return await this.turbosReservesService.reserves(
                { 
                    bot, 
                    state 
                }
            )
        }
        case DexId.Momentum:
        {
            return await this.momentumReservesService.reserves(
                { 
                    bot, 
                    state 
                }
            )
        }
        case DexId.Raydium: {
            return await this.raydiumReservesService.reserves(
                { 
                    bot, 
                    state 
                }
            )
        }
        case DexId.Orca: {
            return await this.orcaReservesService.reserves(
                { 
                    bot, 
                    state 
                }
            )
        }
        case DexId.Meteora: {
            return await this.meteoraReservesService.reserves(
                { 
                    bot, 
                    state 
                }
            )
        }
        default:
            throw new DexNotImplementedException({
                id: state.static.dex.toString(),
            })
        }
    }   
}

export interface OrchestrateReservesParams {
    bot: BotSchema
    liquidityPool: LiquidityPoolSchema
}
