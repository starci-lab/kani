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
    FeesResult,
} from "../interfaces"
import {
    OrcaFeesService 
} from "./orca"
import {
    MeteoraFeesService 
} from "./meteora"
import {
    RaydiumFeesService 
} from "./raydium"
import {
    FlowXFeesService 
} from "./flowx"
import {
    CetusFeesService 
} from "./cetus"
import {
    TurbosFeesService 
} from "./turbos"
import {
    MomentumFeesService 
} from "./momentum"
import {
    LiquidityPoolStateService 
} from "./liquidity-pool-state.service"

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
        private readonly flowxFeesService: FlowXFeesService,
        private readonly cetusFeesService: CetusFeesService,
        private readonly turbosFeesService: TurbosFeesService,
        private readonly momentumFeesService: MomentumFeesService,
        private readonly meteoraFeesService: MeteoraFeesService,
        private readonly raydiumFeesService: RaydiumFeesService,
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
    ) { }
    /**
     * Execute on-chain fees transaction.
     */ 
    async fees(
        {
            bot,
            liquidityPool,
        }: OrchestrateFeesParams,
    ): Promise<FeesResult> {
        // Stage: on-chain/data fetch (load latest pool state from cache/on-chain sources)
        const state = await this.liquidityPoolStateService.getState(liquidityPool)
        // Stage: state/config validation (DEX must exist and be enabled)
        const dex =
            this.primaryMemoryStorageService.dexCollection.findOne(
                {
                    id: {
                        $eq: state.static.dex.toString(),
                    },
                }
            )
        if (!dex) {
            throw new DexNotFoundException({
                id: state.static.dex.toString(),
            })
        }
        if (!this.options.dexIds?.includes(dex.displayId)) {
            throw new DexNotImplementedException(
                {
                    id: state.static.dex.toString(),
                }
            )
        }
        // Stage: state validation (fees require an active position)
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        switch (dex.displayId) {
        case DexId.FlowX:
            return await this.flowxFeesService.fees(
                { 
                    bot, 
                    state 
                }
            )
        case DexId.Cetus:
            return await this.cetusFeesService.fees(
                { 
                    bot, 
                    state 
                }
            )
        case DexId.Turbos:
            return await this.turbosFeesService.fees(
                { 
                    bot, 
                    state 
                }
            )
        case DexId.Momentum:
            return await this.momentumFeesService.fees(
                { 
                    bot, 
                    state 
                }
            )
        case DexId.Raydium: {
            return await this.raydiumFeesService.fees(
                { 
                    bot, 
                    state 
                }
            )
        }
        case DexId.Orca: {
            return await this.orcaFeesService.fees(
                { 
                    bot, 
                    state 
                }
            )
        }
        case DexId.Meteora: {
            return await this.meteoraFeesService.fees(
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

export interface OrchestrateFeesParams {
    bot: BotSchema
    liquidityPool: LiquidityPoolSchema
}
