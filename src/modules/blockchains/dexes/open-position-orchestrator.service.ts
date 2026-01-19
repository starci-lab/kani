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
    LiquidityPoolId,
    LiquidityPoolType,
    PrimaryMemoryStorageService,
    QuoteRatioStatus
} from "@modules/databases"
import {
    DexNotFoundException,
    DexNotImplementedException,
    LiquidityPoolNotFoundException,
    TokenNotFoundException
} from "@exceptions"
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
    ConfirmOpenPositionParams,
    ConfirmOpenPositionResult,
    DlmmLiquidityPoolState,
    ExecuteOpenPositionParams,
    ExecuteOpenPositionResult,
    ClmmLiquidityPoolState,
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
    computeDenomination, createObjectId 
} from "@utils"
import Decimal from "decimal.js"
import {
    FlowXOpenPositionActionService 
} from "./flowx"
import {
    CacheKey, createCacheKey, InjectRedisCache 
} from "@modules/cache"
import {
    Cache 
} from "cache-manager"
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
    OpenPositionPayload 
} from "../types"
import {
    envConfig 
} from "@modules/env"
import {
    v4 
} from "uuid"
import {
    LeaseKey, LeaseService, getLeaseKey 
} from "@modules/lock"
import {
    Connection 
} from "mongoose"
import {
    WinstonLog 
} from "@modules/winston"
import {
    InjectWinston 
} from "@modules/winston"
import {
    Logger as WinstonLogger 
} from "winston"
import {
    InjectSuperJson 
} from "@modules/mixin"
import SuperJSON from "superjson"
import {
    BalanceEligibilityService 
} from "../balance"

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
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        @InjectQueue(bullData[BullQueueName.OpenPosition].name)
        private readonly openPositionQueue: Queue<OpenPositionPayload>,
        private readonly leaseService: LeaseService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        @InjectWinston()
        private readonly logger: WinstonLogger,
        private readonly balanceEligibilityService: BalanceEligibilityService,
    ) { }

    /**
     * Enqueue an open-position job if and only if all preconditions are satisfied.
     *
     * Fail-closed design:
     * Any unmet condition results in a silent return.
     */
    async enqueue(
        {
            liquidityPoolId,
            bot,
        }: EnqueueOpenPositionParams,
    ) {
        /**
         * Lease lock guard:
         * Prevent concurrent actions on the same bot.
         */
        const lease = this.leaseService.lease(
            getLeaseKey(LeaseKey.Action,
                bot.id),
        )
        if (lease.isLocked()) {
            return
        }

        /**
         * Retrieve liquidity pool definition from memory.
         */
        const liquidityPool =
                this.primaryMemoryStorageService.liquidityPools.find(
                    liquidityPool =>
                        liquidityPool.displayId === liquidityPoolId,
                )
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException(
                `Liquidity pool ${liquidityPoolId} not found`,
            )
        }
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
            this.primaryMemoryStorageService.tokens.find(
                token => token.id === bot.targetToken.toString(),
            )
        if (!targetToken) {
            throw new TokenNotFoundException("Target token not found")
        }

        /**
         * Resolve quote token metadata.
         */
        const quoteToken =
            this.primaryMemoryStorageService.tokens.find(
                token => token.id === bot.quoteToken.toString(),
            )
        if (!quoteToken) {
            throw new TokenNotFoundException("Quote token not found")
        }

        /**
         * Ownership check:
         * Ensure the liquidity pool is associated with this bot.
         */
        if (
            !bot.liquidityPools
                .map(liquidityPool => liquidityPool.toString())
                .includes(createObjectId(liquidityPoolId).toString())
        ) {
            return
        }

        /**
         * Convert snapshot balances to BN for precise arithmetic.
         */
        const snapshotTargetBalanceAmountBN = new BN(
            bot.snapshotTargetBalanceAmount,
        )
        const snapshotQuoteBalanceAmountBN = new BN(
            bot.snapshotQuoteBalanceAmount,
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
                    targetBalanceAmount: snapshotTargetBalanceAmountBN,
                    quoteBalanceAmount: snapshotQuoteBalanceAmountBN,
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

        /**
         * Idempotency guard:
         * Prevent duplicate open-position transactions per bot.
         */
        if (
            await this.cacheManager.get(
                createCacheKey(
                    CacheKey.OpenPositionTransaction,
                    {
                        botId: bot.id 
                    },
                ),
            )
        ) {
            return
        }

        /**
         * Fetch latest liquidity pool state.
         * DLMM and non-DLMM pools use different state resolvers.
         */
        let state: LiquidityPoolState | DlmmLiquidityPoolState
        if (liquidityPool.type === LiquidityPoolType.Dlmm) {
            state =
                await this.liquidityPoolStateService.getDlmmState(
                    liquidityPoolId,
                )
        } else {
            state =
                await this.liquidityPoolStateService.getState(
                    liquidityPoolId,
                )
        }

        /**
         * DEX existence validation.
         */
        const dex =
            this.primaryMemoryStorageService.dexes.find(
                dex => dex.id === state.static.dex.toString(),
            )
        if (!dex) {
            throw new DexNotFoundException("Dex not found")
        }

        /**
         * DEX support validation.
         */
        const enabledDex = this.primaryMemoryStorageService.dexes.find(
            dex => dex.id === state.static.dex.toString(),
        )
        if (!enabledDex) {
            throw new DexNotImplementedException(`Dex ${state.static.dex.toString()} not supported`)
        }
        /**
         * Recompute quote ratio for balance normalization.
         */
        const quoteRatioResponse =
            await this.quoteRatioService.computeQuoteRatio({
                targetTokenId: targetToken.displayId,
                quoteTokenId: quoteToken.displayId,
                targetBalanceAmount: new BN(
                    bot.snapshotTargetBalanceAmount || 0,
                ),
                quoteBalanceAmount: new BN(
                    bot.snapshotQuoteBalanceAmount || 0,
                ),
            })

        /**
         * Normalize balances into target-token units.
         */
        const targetBalanceAmountInTarget =
            computeDenomination(
                new BN(bot.snapshotTargetBalanceAmount || 0),
                targetToken.decimals,
            )

        const quoteBalanceAmountInTarget =
            computeDenomination(
                new BN(bot.snapshotQuoteBalanceAmount || 0),
                quoteToken.decimals,
            ).div(quoteRatioResponse.oraclePrice.toNumber())

        /**
         * Total effective balance expressed in target token.
         */
        const totalBalanceAmountInTarget =
            targetBalanceAmountInTarget.add(
                quoteBalanceAmountInTarget,
            )

        /**
         * Minimum balance safety check.
         */
        if (
            totalBalanceAmountInTarget.lt(
                new Decimal(
                    0,
                ),
            )
        ) {
            return
        }

        /**
         * Try to lock the lease.
         */
        const leaseId = v4()
        lease.tryLock(leaseId)
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
                                leaseId,
                            }
                        ]
                    )
                    /**
                * Enqueue open-position job for async processing.
                */
                    await this.openPositionQueue.add(
                        v4(),
                        {
                            jobId: jobRaw.toJSON().id,
                            state: this.superjson.stringify(state),
                            bot,
                            leaseId,
                        }
                    )
                    /**
                * Structured logging for observability.
                */
                    this.logger.verbose(
                        WinstonLog.OpenPositionEnqueued,
                        {
                            botId: bot.id,
                            liquidityPoolId,
                        }
                    )
                }
            )
        } catch (error) {
            // unlock the lease if the job is not enqueued
            lease.unlock(leaseId)
            // log the error
            this.logger.error(
                WinstonLog.OpenPositionEnqueueFailed,
                {
                    botId: bot.id,
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
        const _state = state as LiquidityPoolState | DlmmLiquidityPoolState

        const dex =
            this.primaryMemoryStorageService.dexes.find(
                dex => dex.id === _state.static.dex.toString(),
            )
        if (!dex) throw new DexNotFoundException("Dex not found")

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
                `DEX ${_state.static.dex.toString()} not supported`,
            )
        }
    }

    /**
     * Execute on-chain open-position transaction.
     */
    async execute(
        params: ExecuteOpenPositionParams,
    ): Promise<ExecuteOpenPositionResult> {
        const _state = params.state as LiquidityPoolState | DlmmLiquidityPoolState

        const dex =
            this.primaryMemoryStorageService.dexes.find(
                dex => dex.id === _state.static.dex.toString(),
            )
        if (!dex) throw new DexNotFoundException("Dex not found")
        if (!this.options.dexIds?.includes(dex.displayId)) {
            throw new DexNotImplementedException(
                `Dex ${_state.static.dex.toString()} not supported`,
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
                `DEX ${_state.static.dex.toString()} not supported for execute`,
            )
        }
    }

    /**
     * Confirm open-position transaction result.
     */
    async confirm(
        params: ConfirmOpenPositionParams,
    ): Promise<ConfirmOpenPositionResult> {
        const _state = params.state as LiquidityPoolState | DlmmLiquidityPoolState

        const dex =
            this.primaryMemoryStorageService.dexes.find(
                dex => dex.id === _state.static.dex.toString(),
            )
        if (!dex) throw new DexNotFoundException("Dex not found")
        if (!this.options.dexIds?.includes(dex.displayId)) {
            throw new DexNotImplementedException(
                `Dex ${_state.static.dex.toString()} not supported`,
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
                `DEX ${_state.static.dex.toString()} not supported for confirm`,
            )
        }
    }
}

export interface EnqueueOpenPositionParams {
    bot: BotSchema
    liquidityPoolId: LiquidityPoolId
}
