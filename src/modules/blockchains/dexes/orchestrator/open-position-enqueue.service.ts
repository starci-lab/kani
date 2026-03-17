import {
    Injectable
} from "@nestjs/common"
import {
    BotSchema,
    InjectPrimaryMongoose,
    JobSchema,
    JobStatus,
    JobType,
    LiquidityPoolSchema,
    PrimaryMemoryStorageService,
    QuoteRatioStatus,
    TaskType,
} from "@modules/databases"
import {
    TokenNotFoundException,
    PriceDiagnosticNotReadyException,
    DynamicLiquidityPoolInfoDiagnosticNotReadyException,
} from "@modules/exceptions"
import {
    BN
} from "bn.js"
import {
    QuoteRatioService
} from "../../math"
import {
    envConfig
} from "@modules/env"
import {
    Connection,
    Types,
} from "mongoose"
import {
    AsyncService,
    DayjsService,
    InjectSuperJson
} from "@modules/mixin"
import SuperJSON from "superjson"
// import _ from "lodash"
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
    ActionPayload
} from "../../types"
import {
    EnqueueOpenPositionParams
} from "./types"
import {
    WinstonLog,
    WinstonService
} from "@modules/winston"
import {
    LockAuthorityService
} from "@modules/lock"
import {
    EvalSnapshotService
} from "../../eval"
import {
    IndicatorStatus,
    CacheKey,
    CacheService
} from "@modules/cache"
import _ from "lodash"
import {
    PriceDiagnosticService
} from "./price-diagnostic.service"
import {
    DynamicLiquidityPoolInfoDiagnosticService
} from "./dynamic-liquidity-pool-info-diagnostic.service"

/**
 * Service responsible for enqueuing open position jobs.
 * Validates preconditions and adds jobs to the queue.
 *
 * @example
 * const service = new OpenPositionEnqueueService(...)
 * const job = await service.enqueue({ bot, liquidityPool, jobId })
 */
@Injectable()
export class OpenPositionEnqueueService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly quoteRatioService: QuoteRatioService,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly dayjsService: DayjsService,
        @InjectQueue(bullData[BullQueueName.Action].name)
        private readonly actionQueue: Queue<string>,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
        private readonly lockAuthorityService: LockAuthorityService,
        private readonly evalSnapshotService: EvalSnapshotService,
        private readonly asyncService: AsyncService,
        private readonly cacheService: CacheService,
        private readonly dynamicLiquidityPoolInfoDiagnosticService: DynamicLiquidityPoolInfoDiagnosticService,
        private readonly priceDiagnosticService: PriceDiagnosticService,
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
            oldJob,
            isRetry,
        }: EnqueueOpenPositionParams,
    ) {
        // Validate the open position job.
        if (!await this.validate(
            {
                bot,
                liquidityPool,
                oldJob,
                isRetry,
            }
        )) {
            return
        }
        try {
            let jobId = oldJob?.id
            const session = await this.connection.startSession()
            if (!isRetry) {
                jobId = new Types.ObjectId().toString()
            }
            await session.withTransaction(
                async (clientSession) => {
                    if (!isRetry) {
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
                                    status: JobStatus.Running,
                                    tasks: [
                                    ],
                                    metadata: {
                                        liquidityPoolId: liquidityPool.displayId,
                                    },
                                }
                            ],
                            {
                                session: clientSession,
                            }
                        )
                        const job = jobRaw.toJSON()
                        await this.connection.model<BotSchema>(BotSchema.name)
                            .updateOne(
                                {
                                    _id: bot.id
                                },
                                {
                                    $set: {
                                        activeJob: {
                                            job: job.id,
                                            liquidityPool: liquidityPool.id,
                                            jobType: JobType.OpenPosition,
                                            queuedAt: this.dayjsService.now().toDate(),
                                        },
                                    }
                                },
                                {
                                    session: clientSession
                                }
                            )
                    } else {
                        await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                            {
                                _id: jobId
                            },
                            {
                                $set: {
                                    "activeJob.queuedAt": this.dayjsService.now().toDate(),
                                }
                            },
                            {
                                session: clientSession
                            }
                        )
                    }
                }
            )
            const payload: ActionPayload = {
                jobId: jobId ?? "",
                botId: bot.id,
                jobType: JobType.OpenPosition,
                isRetry,
                tasks: [
                    {
                        /** Open position task */
                        type: TaskType.OpenPosition,
                        payload: {
                            /** Payload for open position task */
                            liquidityPoolId: liquidityPool.id,
                        },
                    },
                ],
            }
            await this.actionQueue.add(
                bot.id,
                this.superjson.stringify(
                    payload
                ),
                {
                    jobId: bot.id,
                }
            )
            if (!isRetry) {
                this.winstonService.log(
                    WinstonLog.JobEnqueued,
                    {
                        jobId: jobId ?? "",
                        botId: bot.id,
                        jobType: JobType.OpenPosition,
                        liquidityPoolId: liquidityPool.displayId,
                    }
                )
            } else {
                this.winstonService.log(
                    WinstonLog.JobRequeued,
                    {
                        jobId: jobId ?? "",
                        botId: bot.id,
                        jobType: JobType.OpenPosition,
                        liquidityPoolId: liquidityPool.displayId,
                    }
                )
            }
        } catch (error) {
            if (!isRetry) {
                this.winstonService.log(
                    WinstonLog.JobEnqueueFailed,
                    {
                        botId: bot.id,
                        jobType: JobType.OpenPosition,
                        liquidityPoolId: liquidityPool.displayId,
                        error: error.message,
                    })
            } else {
                this.winstonService.log(
                    WinstonLog.JobRequeueFailed,
                    {
                        jobId: oldJob?.id ?? "",
                        botId: bot.id,
                        jobType: JobType.OpenPosition,
                        liquidityPoolId: liquidityPool.displayId,
                        error: error.message,
                    }
                )
            }
            this.lockAuthorityService.release({
                botId: bot.id,
            })
        }
    }

    /**
     * Validate if the open position job can be enqueued.
     * 
     * @param bot - The bot.
     * @param liquidityPool - The liquidity pool.
     * @param oldJob - The old job.
     * @returns True if the open position job can be enqueued, false otherwise.
     */
    private async validate(
        {
            bot,
            liquidityPool,
            oldJob,
            isRetry
        }: EnqueueOpenPositionParams
    ): Promise<boolean> {

        // Skip if the bot is not running
        if (!bot.running) {
            this.winstonService.log(
                WinstonLog.JobSkippedBotNotRunning,
                {
                    botId: bot.id,
                    jobType: JobType.OpenPosition,
                    liquidityPoolId: liquidityPool.displayId,
                    jobId: oldJob?.id,
                })
            return false
        }

        // Skip if the bot already has an active position
        if (bot.activePosition && !isRetry) {
            this.winstonService.log(
                WinstonLog.JobSkippedBotAlreadyHasActivePosition,
                {
                    botId: bot.id,
                    liquidityPoolId: liquidityPool.displayId,
                    jobType: JobType.OpenPosition,
                    jobId: oldJob?.id,
                })
            return false
        }

        // Skip if the bot already has an active job
        if (bot.activeJob && !isRetry) {
            this.winstonService.log(
                WinstonLog.JobSkippedBotAlreadyHasActiveJob,
                {
                    botId: bot.id,
                    jobId: bot.activeJob.job.toString(),
                    liquidityPoolId: liquidityPool.displayId,
                    jobType: JobType.OpenPosition,
                }
            )
            return false
        }

        // Skip if no balance snapshot exists
        if (!bot.balanceSnapshots) {
            this.winstonService.log(
                WinstonLog.JobSkippedBotNoBalanceSnapshot,
                {
                    botId: bot.id,
                    liquidityPoolId: liquidityPool.displayId,
                    jobType: JobType.OpenPosition,
                })
            return false
        }
        /**
         * Ownership check:
         * Ensure the liquidity pool is associated with this bot.
         */
        if (
            !_.some(
                bot.liquidityPools,
                _liquidityPool => _liquidityPool.toString() === liquidityPool.id.toString()
            ) && !isRetry
        ) {
            this.winstonService.log(
                WinstonLog.JobSkippedLiquidityPoolNotOwnedByBot,
                {
                    botId: bot.id,
                    liquidityPoolId: liquidityPool.displayId,
                    jobType: JobType.OpenPosition,
                    jobId: oldJob?.id,
                })
            return false
        }
        if (!isRetry) {
            // Skip if the balance snapshot is outside the rescan cooldown window
            const diffMs = this.dayjsService.now().diff(
                this.dayjsService.from(bot.balanceSnapshots.snapshotAt),
                "millisecond",
            )
            if (diffMs > envConfig().executor.runtime.operation.reconcileBalance.cooldown.rescan) {
                this.winstonService.log(
                    WinstonLog.JobSkippedBotBalanceSnapshotNotWithinCooldown,
                    {
                        botId: bot.id,
                        jobType: JobType.OpenPosition,
                        liquidityPoolId: liquidityPool.displayId,
                        jobId: oldJob?.id,
                    }
                )
                return false
            }
        }
        if (!isRetry) {
            // Skip if the bot is not eligible based on snapshot evaluation
            const { eligible } = await this.evalSnapshotService.eval({
                bot
            })
            if (!eligible) {
                this.winstonService.log(WinstonLog.JobSkippedBotNotEligible,
                    {
                        botId: bot.id,
                        liquidityPoolId: liquidityPool.displayId,
                        jobType: JobType.OpenPosition,
                        jobId: oldJob?.id,
                    })
                return false
            }
        }
        // Skip if required diagnostics are not ready
        if (!
        (
            await this.validateDiagnosticsReady(
                bot,
                liquidityPool,
                oldJob
            )
        ) && !isRetry
        ) {
            return false
        }

        // Skip if the quote ratio is not good
        if (!
        (
            await this.validateQuoteRatio(
                bot,
                liquidityPool,
                oldJob
            )
        ) && !isRetry
        ) {
            return false
        }
        // Skip if the violate indicators are not all must reentry
        if (!
        (
            await this.validateViolateIndicators(bot)
        ) && !isRetry
        ) {
            return false
        }
        // Skip if a job already exists in the queue for this bot
        const existingJob = await this.actionQueue.getJob(bot.id)
        if (existingJob) {
            this.winstonService.log(WinstonLog.JobSkippedFoundInQueue,
                {
                    botId: bot.id,
                    bullmqJobId: existingJob.id ?? "",
                    jobType: JobType.OpenPosition,
                    liquidityPoolId: liquidityPool.displayId,
                    jobId: oldJob?.id,
                })
            return false
        }

        // Acquire lock authority to prevent concurrent scheduling
        const acquired = await this.lockAuthorityService.acquire({
            botId: bot.id
        })
        if (!acquired) {
            this.winstonService.log(WinstonLog.OpenPositionLockAuthorityNotAcquired,
                {
                    botId: bot.id,
                })
            return false
        }

        return true
    }

    /**
     * Validate if the diagnostics are ready.
     * 
     * @param bot - The bot.
     * @param liquidityPool - The liquidity pool.
     * @returns True if the diagnostics are ready, false otherwise.
     */
    private async validateDiagnosticsReady(
        bot: BotSchema,
        liquidityPool: LiquidityPoolSchema,
        oldJob?: JobSchema,
    ): Promise<boolean> {
        try {
            await this.asyncService.allMustDone([
                // Validate if the liquidity pool info is ready.
                (async () => {
                    const ready = await this.dynamicLiquidityPoolInfoDiagnosticService.ready(liquidityPool.id)
                    if (!ready) {
                        this.winstonService.log(WinstonLog.JobSkippedLiquidityPoolInfoNotReady,
                            {
                                botId: bot.id,
                                liquidityPoolId: liquidityPool.displayId,
                                jobType: JobType.OpenPosition,
                                jobId: oldJob?.id,
                            })
                        throw new DynamicLiquidityPoolInfoDiagnosticNotReadyException(
                            {
                                liquidityPoolId: liquidityPool.displayId,
                            }
                        )
                    }
                })(),
                // Validate if the price of token A is ready.
                (async () => {
                    const tokenAId = liquidityPool.tokenA.toString()
                    const ready = await this.priceDiagnosticService.ready(tokenAId)
                    if (!ready) {
                        const token = this.primaryMemoryStorageService.tokenMap.get(tokenAId)
                        if (!token) {
                            throw new TokenNotFoundException({
                                id: tokenAId
                            })
                        }
                        this.winstonService.log(WinstonLog.JobSkippedTokenPriceNotReady,
                            {
                                botId: bot.id,
                                liquidityPoolId: liquidityPool.displayId,
                                tokenId: token.displayId,
                                jobType: JobType.OpenPosition,
                                jobId: oldJob?.id,
                            })
                        throw new PriceDiagnosticNotReadyException({
                            tokenId: token.displayId
                        })
                    }
                })(),
                // Validate if the price of token B is ready.
                (async () => {
                    const tokenBId = liquidityPool.tokenB.toString()
                    const ready = await this.priceDiagnosticService.ready(tokenBId)
                    if (!ready) {
                        const token = this.primaryMemoryStorageService.tokenMap.get(tokenBId)
                        if (!token) {
                            throw new TokenNotFoundException(
                                {
                                    id: tokenBId
                                }
                            )
                        }
                        this.winstonService.log(WinstonLog.JobSkippedTokenPriceNotReady,
                            {
                                botId: bot.id,
                                liquidityPoolId: liquidityPool.displayId,
                                tokenId: token.displayId,
                                jobType: JobType.OpenPosition,
                                jobId: oldJob?.id,
                            })
                        throw new PriceDiagnosticNotReadyException(
                            {
                                tokenId: token.displayId
                            }
                        )
                    }
                })(),
            ])
            return true
        } catch {
            return false
        }
    }

    /**
     * Validate if the quote ratio is good.
     * 
     * @param bot - The bot.
     * @param liquidityPool - The liquidity pool.
     * @param oldJob - The old job.
     * @returns True if the quote ratio is good, false otherwise.
     */
    private async validateQuoteRatio(
        bot: BotSchema,
        liquidityPool: LiquidityPoolSchema,
        oldJob?: JobSchema,
    ): Promise<boolean> {
        const targetToken = this.primaryMemoryStorageService.tokenMap.get(bot.targetToken.toString())
        if (!targetToken) {
            throw new TokenNotFoundException({
                id: bot.targetToken.toString()
            })
        }

        const quoteToken = this.primaryMemoryStorageService.tokenMap.get(bot.quoteToken.toString())
        if (!quoteToken) {
            throw new TokenNotFoundException({
                id: bot.quoteToken.toString()
            })
        }

        const snapshotTargetBalanceAmount = new BN(bot.balanceSnapshots?.targetBalanceAmount ?? "0")
        const snapshotQuoteBalanceAmount = new BN(bot.balanceSnapshots?.quoteBalanceAmount ?? "0")

        const {
            quoteRatio
        } = await this.quoteRatioService.computeQuoteRatio({
            targetToken,
            quoteToken,
            targetBalanceAmount: snapshotTargetBalanceAmount,
            quoteBalanceAmount: snapshotQuoteBalanceAmount,
        })

        const status = this.quoteRatioService.checkQuoteRatioStatus({
            quoteRatio
        })
        if (status !== QuoteRatioStatus.Good) {
            this.winstonService.log(
                WinstonLog.JobSkippedQuoteRatioNotGood,
                {
                    botId: bot.id,
                    liquidityPoolId: liquidityPool.displayId,
                    jobType: JobType.OpenPosition,
                    quoteRatio: quoteRatio.toNumber(),
                    quoteRatioStatus: status,
                    jobId: oldJob?.id,
                }
            )
            return false
        }

        return true
    }

    /**
     * Validate if the violate indicators are all must reentry.
     * 
     * @param bot - The bot.
     * @returns True if the violate indicators are all must reentry, false otherwise.
     */
    private async validateViolateIndicators(
        bot: BotSchema,
    ): Promise<boolean> {
        const violateIndicators = await this.cacheService.get({
            key: CacheKey.ViolateIndicatorResults,
            args: [bot.id],
        })
        if (!violateIndicators) {
            return false
        }
        // check if snapshotAt is within the time window of the violate indicators
        const diffMs = this.dayjsService.now().diff(
            this.dayjsService.from(violateIndicators?.snapshotAt ?? ""),
            "millisecond",
        )
        if (diffMs > envConfig().executor.runtime.operation.openPosition.reentry.staleMs) {
            return false
        }
        // all must reentry
        const allMustReentry = violateIndicators?.
            results?.
            every((violateIndicator) => violateIndicator?.status === IndicatorStatus.Reentry) ?? false
        // return true if all must reentry
        return allMustReentry
    }
}
