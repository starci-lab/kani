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
    RaydiumClosePositionActionService 
} from "../raydium"
import {
    OrcaClosePositionActionService 
} from "../orca"
import {
    MODULE_OPTIONS_TOKEN, OPTIONS_TYPE 
} from "../dexes.module-definition"
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
    ExecuteClosePositionResult, 
} from "../../interfaces"

/**
 * Service responsible for orchestrating the close position action across different DEXes.
 * Routes and executes the close position action for a given liquidity pool state and bot.
 *
 * @example
 * const service = new ClosePositionActionService(...)
 * const result = await service.prepare({ bot, state })
 */
/**
 * Orchestrator service for close position actions across multiple DEXes.
 * Routes close position operations to DEX-specific services based on pool configuration.
 *
 * @example
 * const service = new ClosePositionActionService(...)
 * const result = await service.prepare({ bot, state })
 */
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
     * Resolves a DEX record from memory storage or throws an exception.
     * Stage: state validation
     *
     * @param id - The DEX ID to look up
     * @returns The DEX record
     * @throws {DexNotFoundException} If the DEX is not found in memory storage
     */
    private getDexOrThrow(id: string) {
        const dex = this.primaryMemoryStorageService.dexCollection.findOne({
            id: {
                $eq: id,
            },
        })

        // Stage: state validation (DEX must exist)
        if (!dex) {
            throw new DexNotFoundException({
                id 
            })
        }
        return dex
    }

    /**
     * Ensures the DEX is enabled for this executor instance.
     * Stage: state/config validation
     *
     * @param displayId - The DEX display ID to check
     * @throws {DexNotImplementedException} When the DEX is not enabled in module options
     */
    private assertDexEnabledOrThrow(displayId: DexId) {
        if (!this.options.dexIds?.includes(displayId)) {
            throw new DexNotImplementedException({
                displayId 
            })
        }
    }

    /**
     * Prepares the close position action for a given liquidity pool state and bot.
     * Stage: state/config validation (DEX must exist and be enabled for transaction building)
     *
     * @param params - Parameters for preparing the close position action
     * @param params.bot - The bot schema
     * @param params.state - The liquidity pool state
     * @returns The prepared close position action result
     */
    /**
     * Prepares a close position transaction.
     * Delegates preparation logic to DEX-specific service based on pool configuration.
     *
     * @param params - Parameters for preparing close position
     * @returns Prepared transaction with signature
     * @throws {DexNotFoundException} If the DEX is not found in memory storage
     * @throws {DexNotImplementedException} If the DEX is not enabled or not supported
     */
    async prepare(params: PrepareClosePositionParams): Promise<PrepareClosePositionResult> {
        const {
            bot,
            state
        } = params

        // Stage: state/config validation (DEX must exist and be enabled for transaction building)
        const dexId = state.static.dex.toString()
        const dex = this.getDexOrThrow(dexId)
        this.assertDexEnabledOrThrow(dex.displayId)

        // Route to DEX-specific prepare service
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

    /**
     * Executes a close position transaction.
     * Delegates execution logic to DEX-specific service based on pool configuration.
     *
     * @param params - Parameters for executing close position
     * @returns Execution result with transaction hashes
     * @throws {DexNotFoundException} If the DEX is not found in memory storage
     * @throws {DexNotImplementedException} If the DEX is not supported
     * @note `execute()` does not enforce `options.dexIds` (enabled DEX set).
     *       This preserves existing behavior.
     */
    async execute(
        params: ExecuteClosePositionParams,
    ): Promise<ExecuteClosePositionResult> {
        const { state } = params

        // Stage: state validation (DEX must exist for execution routing)
        const dexId = state.static.dex.toString()
        const dex = this.getDexOrThrow(dexId)

        // Route to DEX-specific execute service
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
