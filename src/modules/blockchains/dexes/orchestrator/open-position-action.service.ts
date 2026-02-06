import {
    Inject, Injectable 
} from "@nestjs/common"
import {
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
} from "../dexes.module-definition"
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
} from "../types"
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

/**
 * Orchestrator service for open position actions across multiple DEXes.
 * Routes open position operations to DEX-specific services based on pool configuration.
 *
 * @example
 * const service = new OpenPositionActionService(...)
 * const result = await service.prepare({ bot, state })
 */
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
     * Resolves a DEX record from memory storage or throws an exception.
     * Stage: state validation
     *
     * @param dexId - The DEX ID to look up
     * @returns The DEX record
     * @throws {DexNotFoundException} If the DEX is not found in memory storage
     */
    private getDexOrThrow(dexId: string) {
        const dex = this.primaryMemoryStorageService.dexCollection.findOne({
            id: {
                $eq: dexId,
            },
        })

        // Stage: state validation (DEX must exist)
        if (!dex) {
            throw new DexNotFoundException({
                id: dexId 
            })
        }
        return dex
    }

    /**
     * Ensures the DEX is enabled for this executor instance.
     * Stage: state/config validation
     *
     * @param dexId - The DEX ID (for error reporting)
     * @param dexDisplayId - The DEX display ID to check
     * @throws {DexNotImplementedException} When the DEX is not enabled in module options
     */
    private assertDexEnabledOrThrow(dexId: string, dexDisplayId: DexId) {
        if (!this.options.dexIds?.includes(dexDisplayId)) {
            throw new DexNotImplementedException({
                id: dexId 
            })
        }
    }

    /**
     * Prepares an open position transaction.
     * Delegates preparation logic to DEX-specific service based on pool configuration.
     *
     * @param param - Parameters for preparing open position
     * @param param.state - The liquidity pool state (CLMM or DLMM)
     * @param param.bot - Bot schema
     * @returns Prepared transaction with position details
     * @throws {DexNotFoundException} If the DEX is not found in memory storage
     * @throws {DexNotImplementedException} If the DEX is not supported
     * @note `prepare()` does NOT enforce `options.dexIds` (enabled DEX set).
     *       Execution/confirmation do enforce it. This preserves existing behavior.
     */
    async prepare({
        state,
        bot,
    }: PrepareOpenPositionParams): Promise<PrepareOpenPositionResult> {
        // Stage: state validation (DEX must exist for this pool)
        const _state = state as ClmmLiquidityPoolState | DlmmLiquidityPoolState

        const dexId = _state.static.dex.toString()
        const dex = this.getDexOrThrow(dexId)

        // Route to DEX-specific prepare service
        switch (dex.displayId) {
        case DexId.Raydium:
            return this.raydiumOpenPositionActionService.prepare({
                state: _state,
                bot 
            })
        case DexId.Orca:
            return this.orcaOpenPositionActionService.prepare({
                state: _state,
                bot 
            })
        case DexId.Meteora:
            return this.meteoraOpenPositionActionService.prepare({
                state: _state,
                bot 
            })
        case DexId.FlowX:
            return this.flowxOpenPositionActionService.prepare({
                state,
                bot 
            })
        case DexId.Cetus:
            return this.cetusOpenPositionActionService.prepare({
                state,
                bot 
            })
        case DexId.Turbos:
            return this.turbosOpenPositionActionService.prepare({
                state,
                bot 
            })
        case DexId.Momentum:
            return this.momentumOpenPositionActionService.prepare({
                state,
                bot 
            })
        default:
            throw new DexNotImplementedException({
                id: _state.static.dex.toString(),
            })
        }
    }

    /**
     * Executes an on-chain open position transaction.
     * Delegates execution logic to DEX-specific service based on pool configuration.
     *
     * @param params - Parameters for executing open position
     * @returns Execution result with position ID and transaction hashes
     * @throws {DexNotFoundException} If the DEX is not found in memory storage
     * @throws {DexNotImplementedException} If the DEX is not enabled or not supported
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

        // Route to DEX-specific execute service
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
            throw new DexNotImplementedException({
                id: _state.static.dex.toString(),
            })
        }
    }

    /**
     * Confirms an open position transaction result.
     * Delegates confirmation logic to DEX-specific service based on pool configuration.
     *
     * @param params - Parameters for confirming open position
     * @returns Confirmation result with position liquidity
     * @throws {DexNotFoundException} If the DEX is not found in memory storage
     * @throws {DexNotImplementedException} If the DEX is not enabled or not supported
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

        // Route to DEX-specific confirm service
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
            throw new DexNotImplementedException({
                id: _state.static.dex.toString(),
            })
        }
    }
}
