import {
    Inject, Injectable 
} from "@nestjs/common"
import {
    BotSchema,
    DexId,
    InjectPrimaryMongoose,
    JobSchema,
    JobStatus,
    JobType,
    PrimaryMemoryStorageService,
    QuoteRatioStatus,
    LiquidityPoolSchema
} from "@modules/databases"
import {
    DexNotFoundException,
    DexNotImplementedException,
    BalanceSnapshotsNotFoundException,
    TokenNotFoundException
} from "@modules/exceptions"
import {
    RaydiumOpenPositionActionService 
} from "./raydium"
import {
    OrcaOpenPositionActionService 
} from "./orca"
import {
    MODULE_OPTIONS_TOKEN, OPTIONS_TYPE 
} from "./dexes.module-definition"
import {
    MeteoraOpenPositionActionService 
} from "./meteora"
import {
    ClmmLiquidityPoolState,
    ConfirmOpenPositionParams,
    ConfirmOpenPositionResult,
    DlmmLiquidityPoolState,
    ExecuteOpenPositionParams,
    ExecuteOpenPositionResult,
    PrepareOpenPositionParams,
    PrepareOpenPositionResult
} from "../interfaces"
import {
    BN 
} from "bn.js"
import {
    QuoteRatioService 
} from "../math"
import {
    CetusOpenPositionActionService 
} from "./cetus"
import {
    TurbosOpenPositionActionService 
} from "./turbos"
import {
    MomentumOpenPositionActionService 
} from "./momentum"
import {
    InjectQueue 
} from "@nestjs/bullmq"
import {
    bullData, BullQueueName 
} from "@modules/bullmq"
import {
    Queue 
} from "bullmq"
import {
    envConfig 
} from "@modules/env"
import {
    v4 
} from "uuid"
import {
    Connection, 
} from "mongoose"
import {
    InjectSuperJson, DayjsService
} from "@modules/mixin"
import SuperJSON from "superjson"
import _ from "lodash"
import {
    FlowXOpenPositionActionService 
} from "./flowx"
import {
    OpenPositionPayload 
} from "../types"

/**
 * OpenPositionOrchestratorService
 *
 * High-level orchestration layer for opening a position.
 *
 * Responsibilities:
 * - Evaluate whether an open-position action SHOULD happen
 * - Apply safety guards (balance, snapshot, quote ratio, idempotency)
 * - Handle concurrency via sema
 * - Validate liquidity pool and DEX support
 * - Create job and enqueue async execution
 *
 * This service does NOT perform on-chain execution.
 */
@Injectable()
export class OpenPositionOrchestratorService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly raydiumOpenPositionActionService: RaydiumOpenPositionActionService,
        private readonly orcaOpenPositionActionService: OrcaOpenPositionActionService,
        private readonly meteoraOpenPositionActionService: MeteoraOpenPositionActionService,
        private readonly quoteRatioService: QuoteRatioService,
        private readonly flowxOpenPositionActionService: FlowXOpenPositionActionService,
        private readonly cetusOpenPositionActionService: CetusOpenPositionActionService,
        private readonly turbosOpenPositionActionService: TurbosOpenPositionActionService,
        private readonly momentumOpenPositionActionService: MomentumOpenPositionActionService,
        private readonly dayjsService: DayjsService,
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        @InjectQueue(bullData[BullQueueName.OpenPosition].name)
        private readonly openPositionQueue: Queue<string>,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
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

    /** State validation: resolve a token from memory storage or throw `TokenNotFoundException`. */
    private getTokenOrThrow(tokenId: string) {
        const token = this.primaryMemoryStorageService.tokenCollection.findOne(
            {
                id: {
                    $eq: tokenId,
                },
            }
        )
        if (!token) {
            throw new TokenNotFoundException({
                id: tokenId 
            })
        }
        return token
    }

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
     * Enqueue an open-position job if and only if all preconditions are satisfied.
     *
     * Fail-closed design:
     * Any unmet condition results in a silent return.
     */
    async enqueue(
        {
            liquidityPool,
            bot,
            jobId,
            isRetry,
        }: EnqueueOpenPositionParams,
    ) {
        // Stage: state validation (token metadata required for quote-ratio computation)
        const targetToken = this.getTokenOrThrow(bot.targetToken.toString())
        const quoteToken = this.getTokenOrThrow(bot.quoteToken.toString())
        /**
         * Ownership check:
         * Ensure the liquidity pool is associated with this bot.
         */
        if (
            !_.some(
                bot.liquidityPools,
                _liquidityPool => _liquidityPool.toString() === liquidityPool.id.toString()
            )
        ) {
            return null
        }
        // Stage: state validation (balance snapshots required for quote-ratio computation)
        if (!bot.balanceSnapshots) {
            throw new BalanceSnapshotsNotFoundException({
                botId: bot.id,
            })
        }
        /**
         * Convert snapshot balances to BN for precise arithmetic.
         */
        const snapshotTargetBalanceAmount = new BN(
            bot.balanceSnapshots.targetBalanceAmount,
        )
        const snapshotQuoteBalanceAmount = new BN(
            bot.balanceSnapshots.quoteBalanceAmount,
        )
        /**
         * Quote ratio computation:
         * Determines whether market conditions are favorable.
         */
        const { quoteRatio } =
            await this.quoteRatioService.computeQuoteRatio(
                {
                    targetToken,
                    quoteToken,
                    targetBalanceAmount: snapshotTargetBalanceAmount,
                    quoteBalanceAmount: snapshotQuoteBalanceAmount,
                }
            )
        /**
         * Abort if quote ratio is not in a Good state.
         */
        if (
            this.quoteRatioService.checkQuoteRatioStatus(
                {
                    quoteRatio 
                }
            ) !== QuoteRatioStatus.Good
        ) {
            return null
        }
        // start a session
        const session = await this.connection.startSession()
        return await session.withTransaction(
            async () => {
                /**
                * Persist job record.
                */
                const [jobRaw] = await this.connection.model<JobSchema>(
                    JobSchema.name
                ).create(
                    [
                        {
                            _id: jobId,
                            liquidityPool: liquidityPool.id,
                            bot: bot.id,
                            executor: envConfig().executor.id,
                            type: JobType.OpenPosition,
                            status: JobStatus.Pending,
                        }
                    ]
                )
                const job = jobRaw.toJSON()
                /**
                 * Update the balance snapshots snapshotAt
                 */
                /**
                    * Update the bot with the active job id.
                    */
                await this.connection.model<BotSchema>(BotSchema.name)
                    .updateOne(
                        {
                            _id: bot.id 
                        },
                        {
                            $set: {
                                activeJob: {
                                    job: job.id,
                                    queuedAt: this.dayjsService.now().toDate(),
                                },
                            } 
                        },
                        {
                            session 
                        }
                    )
                /**
                    * Enqueue open-position job for async processing.
                    */
                const payload: OpenPositionPayload = {
                    jobId: job.id,
                    liquidityPoolId: liquidityPool.displayId,
                    botId: bot.id,
                    isRetry,
                }
                const bullmqJob = await this.openPositionQueue.add(
                    v4(),
                    this.superjson.stringify(payload),
                    {
                        jobId: bot.id,
                    }
                )
                return bullmqJob
            }
        )
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
        const _state = params.state as ClmmLiquidityPoolState | DlmmLiquidityPoolState

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

export interface EnqueueOpenPositionParams {
    bot: BotSchema
    liquidityPool: LiquidityPoolSchema
    jobId: string
    isRetry?: boolean
}
