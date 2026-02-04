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
    RaydiumClosePositionActionService 
} from "../raydium"
import {
    OrcaClosePositionActionService 
} from "../orca"
import {
    MODULE_OPTIONS_TOKEN, OPTIONS_TYPE 
} from "./orchestrator.module-definition"
import {
    MeteoraClosePositionActionService 
} from "../meteora"
import {
    FlowXClosePositionActionService 
} from "../flowx"
import {
    CetusClosePositionActionService 
} from "../cetus"
import {
    TurbosClosePositionActionService 
} from "../turbos"
import {
    MomentumClosePositionActionService 
} from "../momentum"
import { 
    PrepareClosePositionResult, 
    ExecuteClosePositionParams,
    PrepareClosePositionParams, 
} from "../../interfaces"

@Injectable()
export class ClosePositionActionService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly raydiumClosePositionActionService: RaydiumClosePositionActionService,
        private readonly orcaClosePositionActionService: OrcaClosePositionActionService,
        private readonly meteoraClosePositionActionService: MeteoraClosePositionActionService,
        private readonly flowXClosePositionActionService: FlowXClosePositionActionService,
        private readonly cetusClosePositionActionService: CetusClosePositionActionService,
        private readonly turbosClosePositionActionService: TurbosClosePositionActionService,
        private readonly momentumClosePositionActionService: MomentumClosePositionActionService,
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
    ) {}

    /**
     * === Error-handling convention (DEX orchestrators) ===
     *
     * Stages:
     * - Input validation: required params are missing/invalid (throw immediately)
     * - State validation: bot/pool/dex state is missing or inconsistent (throw immediately)
     * - On-chain / data fetch: fetching required dynamic state fails (throws from called service)
     * - Transaction building: DEX-specific builder throws (bubble up)
     * - Execution: DEX-specific executor throws (bubble up)
     */

    /** State validation: resolve a DEX record from memory storage or throw `DexNotFoundException`. */
    private getDexOrThrow(id: string) {
        const dex = this.primaryMemoryStorageService.dexCollection.findOne(
            {
                id: {
                    $eq: id,
                },
            }
        )
        if (!dex) {
            throw new DexNotFoundException({
                id 
            })
        }
        return dex
    }

    /**
     * State/config validation: ensure the DEX is enabled for this executor instance.
     * Throws `DexNotImplementedException` (existing behavior) when disabled.
     */
    private assertDexEnabledOrThrow(displayId: DexId) {
        if (!this.options.dexIds?.includes(displayId)) {
            throw new DexNotImplementedException({
                displayId 
            })
        }
    }

    async prepare(params: PrepareClosePositionParams,
    ): Promise<PrepareClosePositionResult> {
        const { bot, state } = params
        // Stage: state/config validation (DEX must exist and be enabled for transaction building)
        const dexId = state.static.dex.toString()
        const dex = this.getDexOrThrow(dexId)
        this.assertDexEnabledOrThrow(dex.displayId)
        switch (dex.displayId) {
        case DexId.FlowX: {
            return await this.flowXClosePositionActionService.prepare({
                state,
                bot,
            })
        }
        case DexId.Cetus: {
            return await this.cetusClosePositionActionService.prepare({
                state,
                bot,
            })
        }
        case DexId.Turbos: {
            return await this.turbosClosePositionActionService.prepare({
                state,
                bot,
            })
        }
        case DexId.Momentum: {
            return await this.momentumClosePositionActionService.prepare(params)
        }
        case DexId.Raydium: {
            return await this.raydiumClosePositionActionService.prepare(params)
        }
        case DexId.Orca: {
            return await this.orcaClosePositionActionService.prepare(params)
        }
        case DexId.Meteora: {
            return await this.meteoraClosePositionActionService.prepare(params)
        }
        default: {
            throw new DexNotImplementedException({
                id: state.static.dex.toString(),
            })
        }
        }
    }

    async execute(
        params: ExecuteClosePositionParams,
    ): Promise<void> {
        const { state } = params
        // Stage: state validation (DEX must exist for execution routing)
        const dexId = state.static.dex.toString()
        const dex = this.getDexOrThrow(dexId)
        // NOTE: existing behavior: execute() does not enforce `options.dexIds` (enabled DEX set).
        // We keep that behavior and document it here.
        switch (dex.displayId) {
        case DexId.Raydium: {
            return await this.raydiumClosePositionActionService.execute(params)
        }
        case DexId.Orca: {
            return await this.orcaClosePositionActionService.execute(params)
        }
        case DexId.Meteora: {
            return await this.meteoraClosePositionActionService.execute(params)
        }
        case DexId.FlowX: {
            return await this.flowXClosePositionActionService.execute(params)
        }
        case DexId.Cetus: {
            return await this.cetusClosePositionActionService.execute(params)
        }
        case DexId.Turbos: {
            return await this.turbosClosePositionActionService.execute(params)
        }
        case DexId.Momentum: {
            return await this.momentumClosePositionActionService.execute(params)
        }
        default: {
            throw new DexNotImplementedException({
                id: state.static.dex.toString(),
            })
        }
        }
    }
}
