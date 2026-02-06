import {
    Inject,
    Injectable,
} from "@nestjs/common"
import {
    DexId,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    DexNotFoundException,
    DexNotImplementedException,
    ActivePositionNotFoundException,
} from "@modules/exceptions"
import {
    ReservesWithFeesResult,
    LiquidityPoolState,
} from "../types"
import {
    OrcaReservesWithFeesService,
} from "../orca"
import {
    MeteoraReservesWithFeesService,
} from "../meteora"
import {
    RaydiumReservesWithFeesService,
} from "../raydium"
import {
    FlowXReservesWithFeesService,
} from "../flowx"
import {
    CetusReservesWithFeesService,
} from "../cetus"
import {
    TurbosReservesWithFeesService,
} from "../turbos"
import {
    MomentumReservesWithFeesService,
} from "../momentum"
import {
    LiquidityPoolStateService,
} from "./liquidity-pool-state.service"
import {
    MODULE_OPTIONS_TOKEN, OPTIONS_TYPE 
} from "../dexes.module-definition"
import {
    OrchestrateReservesWithFeesParams
} from "./types"

/**
 * High-level orchestration layer for calculating reserves and fees together.
 * Evaluates whether reserves and fees should be calculated, validates liquidity pool and DEX support,
 * and calculates reserves and fees in a single call.
 *
 * @example
 * const service = new ReservesWithFeesActionService(...)
 * const result = await service.reservesWithFees({ bot, liquidityPool })
 */
@Injectable()
export class ReservesWithFeesActionService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly orcaReservesWithFeesService: OrcaReservesWithFeesService,
        private readonly meteoraReservesWithFeesService: MeteoraReservesWithFeesService,
        private readonly raydiumReservesWithFeesService: RaydiumReservesWithFeesService,
        private readonly flowxReservesWithFeesService: FlowXReservesWithFeesService,
        private readonly cetusReservesWithFeesService: CetusReservesWithFeesService,
        private readonly turbosReservesWithFeesService: TurbosReservesWithFeesService,
        private readonly momentumReservesWithFeesService: MomentumReservesWithFeesService,
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
    ) { }

    /**
     * Execute reserves and fees calculation.
     */
    async reservesWithFees(
        {
            bot,
            liquidityPool,
        }: OrchestrateReservesWithFeesParams,
    ): Promise<ReservesWithFeesResult> {
        // Stage: on-chain/data fetch (load latest pool state from cache/on-chain sources)
        const dynamicLiquidityPoolInfo = await this.liquidityPoolStateService.getDynamicLiquidityPoolInfo(liquidityPool)
        const state: LiquidityPoolState = {
            static: liquidityPool,
            dynamic: dynamicLiquidityPoolInfo,
        }
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
        // Stage: state validation (requires an active position)
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        switch (dex.displayId) {
        case DexId.FlowX:
            return await this.flowxReservesWithFeesService.reservesWithFees({
                bot,
                state,
            })
        case DexId.Cetus:
            return await this.cetusReservesWithFeesService.reservesWithFees({
                bot,
                state,
            })
        case DexId.Turbos:
            return await this.turbosReservesWithFeesService.reservesWithFees({
                bot,
                state,
            })
        case DexId.Momentum:
            return await this.momentumReservesWithFeesService.reservesWithFees({
                bot,
                state,
            })
        case DexId.Raydium: {
            return await this.raydiumReservesWithFeesService.reservesWithFees({
                bot,
                state,
            })
        }
        case DexId.Orca: {
            return await this.orcaReservesWithFeesService.reservesWithFees({
                bot,
                state,
            })
        }
        case DexId.Meteora: {
            return await this.meteoraReservesWithFeesService.reservesWithFees({
                bot,
                state,
            })
        }
        default:
            throw new DexNotImplementedException({
                id: state.static.dex.toString(),
            })
        }
    }
}
