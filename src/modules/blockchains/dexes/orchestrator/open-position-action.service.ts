import {
    Inject, Injectable 
} from "@nestjs/common"
import {
    BotSchema,
    DexId,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    DexNotFoundException,
    DexNotImplementedException,
} from "@modules/exceptions"
import {
    RaydiumOpenPositionActionService 
} from "../raydium"
import {
    OrcaOpenPositionActionService 
} from "../orca"
import {
    MODULE_OPTIONS_TOKEN, OPTIONS_TYPE 
} from "./orchestrator.module-definition"
import {
    MeteoraOpenPositionActionService 
} from "../meteora"
import {
    ClmmLiquidityPoolState,
    ConfirmOpenPositionParams,
    ConfirmOpenPositionResult,
    DlmmLiquidityPoolState,
    ExecuteOpenPositionParams,
    ExecuteOpenPositionResult,
    LiquidityPoolState,
    PrepareOpenPositionParams,
    PrepareOpenPositionResult
} from "../../interfaces"
import {
    CetusOpenPositionActionService 
} from "../cetus"
import {
    TurbosOpenPositionActionService 
} from "../turbos"
import {
    MomentumOpenPositionActionService 
} from "../momentum"
import {
    FlowXOpenPositionActionService 
} from "../flowx"

@Injectable()
export class OpenPositionActionService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly raydiumOpenPositionActionService: RaydiumOpenPositionActionService,
        private readonly orcaOpenPositionActionService: OrcaOpenPositionActionService,
        private readonly meteoraOpenPositionActionService: MeteoraOpenPositionActionService,
        private readonly flowxOpenPositionActionService: FlowXOpenPositionActionService,
        private readonly cetusOpenPositionActionService: CetusOpenPositionActionService,
        private readonly turbosOpenPositionActionService: TurbosOpenPositionActionService,
        private readonly momentumOpenPositionActionService: MomentumOpenPositionActionService,
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
    ) { }

    /**
     * === Error-handling convention (DEX orchestrators) ===
     *
     * This file follows a staged error pattern to make failures predictable:
     * - Input validation: required params are missing/invalid (throw immediately)
     * - State validation: bot/pool/dex state is missing or inconsistent (throw immediately)
     * - On-chain / data fetch: fetching required dynamic state fails (throws from called service)
     * - Transaction building: DEX-specific builder throws (bubble up)
     * - Execution: DEX-specific executor throws (bubble up)
     * - Event parsing / confirmation: DEX-specific confirm/parsers throw (bubble up)
     *
     * We do NOT change behavior here—only organize throws and document intent.
     */

    /** State validation: resolve a DEX record from memory storage or throw `DexNotFoundException`. */
    private getDexOrThrow(dexId: string) {
        const dex = this.primaryMemoryStorageService.dexCollection.findOne(
            {
                id: {
                    $eq: dexId,
                },
            }
        )
        if (!dex) {
            throw new DexNotFoundException({
                id: dexId 
            })
        }
        return dex
    }

    /**
     * State/config validation: ensure the DEX is enabled for this executor instance.
     * Throws `DexNotImplementedException` (existing behavior) when disabled.
     */
    private assertDexEnabledOrThrow(dexId: string, dexDisplayId: DexId) {
        if (!this.options.dexIds?.includes(dexDisplayId)) {
            throw new DexNotImplementedException({
                id: dexId 
            })
        }
    }

    /**
     * Prepare open-position transaction.
     * Delegates preparation logic to DEX-specific service.
     */
    async prepare(
        {
            state,
            bot,
        }: PrepareOpenPositionParams,
    ): Promise<PrepareOpenPositionResult> {
        // Stage: state validation (DEX must exist for this pool)
        const _state = state as ClmmLiquidityPoolState | DlmmLiquidityPoolState

        const dexId = _state.static.dex.toString()
        const dex = this.getDexOrThrow(dexId)

        // NOTE: existing behavior: `prepare()` does NOT enforce `options.dexIds` (enabled DEX set).
        // Execution/confirmation do enforce it. We keep that behavior and document it here.

        switch (dex.displayId) {
        case DexId.Raydium:
            return this.raydiumOpenPositionActionService.prepare({
                state: _state, bot 
            })
        case DexId.Orca:
            return this.orcaOpenPositionActionService.prepare({
                state: _state, bot 
            })
        case DexId.Meteora:
            return this.meteoraOpenPositionActionService.prepare({
                state: _state, bot 
            })
        case DexId.FlowX:
            return this.flowxOpenPositionActionService.prepare({
                state, bot 
            })
        case DexId.Cetus:
            return this.cetusOpenPositionActionService.prepare({
                state, bot 
            })
        case DexId.Turbos:
            return this.turbosOpenPositionActionService.prepare({
                state, bot 
            })
        case DexId.Momentum:
            return this.momentumOpenPositionActionService.prepare({
                state, bot 
            })
        default:
            throw new DexNotImplementedException(
                {
                    id: _state.static.dex.toString(),
                }
            )
        }
    }

    /**
     * Execute on-chain open-position transaction.
     */
    async execute(
        params: ExecuteOpenPositionParams,
    ): Promise<ExecuteOpenPositionResult> {
        const _state = params.state as ClmmLiquidityPoolState | DlmmLiquidityPoolState

        // Stage: state/config validation (DEX must exist and be enabled for execution)
        const dexId = _state.static.dex.toString()
        const dex = this.getDexOrThrow(dexId)
        this.assertDexEnabledOrThrow(dexId,
            dex.displayId)

        switch (dex.displayId) {
        case DexId.FlowX:
            return this.flowxOpenPositionActionService.execute(params)
        case DexId.Cetus:
            return this.cetusOpenPositionActionService.execute(params)
        case DexId.Turbos:
            return this.turbosOpenPositionActionService.execute(params)
        case DexId.Momentum:
            return this.momentumOpenPositionActionService.execute(params)
        case DexId.Raydium:
            return this.raydiumOpenPositionActionService.execute(params)
        case DexId.Orca:
            return this.orcaOpenPositionActionService.execute(params)
        case DexId.Meteora:
            return this.meteoraOpenPositionActionService.execute(params)
        default:
            throw new DexNotImplementedException(
                {
                    id: _state.static.dex.toString(),
                }
            )
        }
    }

    /**
     * Confirm open-position transaction result.
     */
    async confirm(
        params: ConfirmOpenPositionParams,
    ): Promise<ConfirmOpenPositionResult> {
        const _state = params.state as LiquidityPoolState

        // Stage: state/config validation (DEX must exist and be enabled for confirmation)
        const dexId = _state.static.dex.toString()
        const dex = this.getDexOrThrow(dexId)
        this.assertDexEnabledOrThrow(dexId,
            dex.displayId)

        switch (dex.displayId) {
        case DexId.FlowX:
            return this.flowxOpenPositionActionService.confirm(params)
        case DexId.Cetus:
            return this.cetusOpenPositionActionService.confirm(params)
        case DexId.Turbos:
            return this.turbosOpenPositionActionService.confirm(params)
        case DexId.Momentum:
            return this.momentumOpenPositionActionService.confirm(params)
        case DexId.Raydium:
            return this.raydiumOpenPositionActionService.confirm(params)
        case DexId.Orca:
            return this.orcaOpenPositionActionService.confirm(params)
        case DexId.Meteora:
            return this.meteoraOpenPositionActionService.confirm(params)
        default:
            throw new DexNotImplementedException(
                {
                    id: _state.static.dex.toString(),
                }
            )
        }
    }
}
