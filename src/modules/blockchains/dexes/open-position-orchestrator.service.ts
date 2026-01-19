import {
    Inject, Injectable 
} from "@nestjs/common"
import {
    LiquidityPoolStateService 
} from "./liquidity-pool-state.service"
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
    SnapshotBalancesNotFoundException,
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
    Connection 
} from "mongoose"
import {
    WinstonService, WinstonLog 
} from "@modules/winston"
import {
    InjectSuperJson 
} from "@modules/mixin"
import SuperJSON from "superjson"
import {
    BalanceEligibilityService 
} from "../balance"
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
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly raydiumOpenPositionActionService: RaydiumOpenPositionActionService,
        private readonly orcaOpenPositionActionService: OrcaOpenPositionActionService,
        private readonly meteoraOpenPositionActionService: MeteoraOpenPositionActionService,
        private readonly quoteRatioService: QuoteRatioService,
        private readonly flowxOpenPositionActionService: FlowXOpenPositionActionService,
        private readonly cetusOpenPositionActionService: CetusOpenPositionActionService,
        private readonly turbosOpenPositionActionService: TurbosOpenPositionActionService,
        private readonly momentumOpenPositionActionService: MomentumOpenPositionActionService,
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        @InjectQueue(bullData[BullQueueName.OpenPosition].name)
        private readonly openPositionQueue: Queue<string>,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly balanceEligibilityService: BalanceEligibilityService,
        private readonly winstonService: WinstonService,
    ) { }

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
        }: EnqueueOpenPositionParams,
    ) {
        /**
         * Balance eligibility check:
         * Ensure bot has sufficient total balance (USD-based).
         */
        const { 
            isEligible
        } = await this.balanceEligibilityService.evaluateBalanceEligibility({
            bot: bot,
        })
        if (!isEligible) {
            return
        }
        /**
         * Resolve target token metadata.
         */
        const targetToken =
            this.primaryMemoryStorageService.tokenCollection.findOne({
                id: {
                    $eq: bot.targetToken.toString(),
                },
            })
        if (!targetToken) {
            throw new TokenNotFoundException({
                id: bot.targetToken.toString(),
            })
        }

        /**
         * Resolve quote token metadata.
         */
        const quoteToken =
            this.primaryMemoryStorageService.tokenCollection.findOne({
                id: {
                    $eq: bot.quoteToken.toString(),
                },
            })
        if (!quoteToken) {
            throw new TokenNotFoundException({
                id: bot.quoteToken.toString(),
            })
        }

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
            return
        }
        if (!bot.snapshots) {
            throw new SnapshotBalancesNotFoundException({
                botId: bot.id,
            })
        }
        /**
         * Convert snapshot balances to BN for precise arithmetic.
         */
        const snapshotTargetBalanceAmount = new BN(
            bot.snapshots.targetBalanceAmount,
        )
        const snapshotQuoteBalanceAmount = new BN(
            bot.snapshots.quoteBalanceAmount,
        )
        /**
         * Quote ratio computation:
         * Determines whether market conditions are favorable.
         */
        const { quoteRatio } =
            await this.quoteRatioService.computeQuoteRatio(
                {
                    targetTokenId: targetToken.displayId,
                    quoteTokenId: quoteToken.displayId,
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
            return
        }
        // start a session
        const session = await this.connection.startSession()
        try {
            await session.withTransaction(
                async () => {
                /**
                * Persist job record.
                */
                    const [jobRaw] = await this.connection.model<JobSchema>(
                        JobSchema.name
                    ).create(
                        [
                            {
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
                    * Enqueue open-position job for async processing.
                    */
                    const payload: OpenPositionPayload = {
                        jobId: job.id,
                        liquidityPoolId: liquidityPool.displayId,
                        botId: bot.id,
                    }
                    await this.openPositionQueue.add(
                        v4(),
                        this.superjson.stringify(payload)
                    )
                    /**
                    * Structured logging for observability.
                    */
                    this.winstonService.log(
                        WinstonLog.OpenPositionEnqueued,
                        {
                            botId: bot.id,
                            liquidityPoolId: liquidityPool.displayId,
                        }
                    )
                }
            )
        } catch (error) {
            // log the error
            this.winstonService.log(
                WinstonLog.OpenPositionEnqueueFailed,
                {
                    botId: bot.id,
                    liquidityPoolId: liquidityPool.displayId,
                    error: error.message,
                }
            )
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
        const _state = state as ClmmLiquidityPoolState | DlmmLiquidityPoolState

        const dex =
            this.primaryMemoryStorageService.dexCollection.findOne(
                {
                    id: {
                        $eq: _state.static.dex.toString(),
                    },
                }
            )
        if (!dex) throw new DexNotFoundException({
            id: _state.static.dex.toString(),
        })

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
        const dex =
            this.primaryMemoryStorageService.dexCollection.findOne(
                {
                    id: {
                        $eq: _state.static.dex.toString(),
                    },
                }
            )
        if (!dex) throw new DexNotFoundException({
            id: _state.static.dex.toString(),
        })
        if (!this.options.dexIds?.includes(dex.displayId)) {
            throw new DexNotImplementedException(
                {
                    id: _state.static.dex.toString(),
                }
            )
        }
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

        const dex =
            this.primaryMemoryStorageService.dexCollection.findOne(
                {
                    id: {
                        $eq: _state.static.dex.toString(),
                    },
                }
            )
        if (!dex) throw new DexNotFoundException({
            id: _state.static.dex.toString(),
        })
        if (!this.options.dexIds?.includes(dex.displayId)) {
            throw new DexNotImplementedException(
                {
                    id: _state.static.dex.toString(),
                }
            )
        }
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
}
