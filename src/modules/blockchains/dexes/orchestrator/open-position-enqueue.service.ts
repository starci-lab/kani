import {
    Injectable 
} from "@nestjs/common"
import {
    BotSchema,
    InjectPrimaryMongoose,
    JobSchema,
    JobStatus,
    JobType,
    PrimaryMemoryStorageService,
    QuoteRatioStatus,
    LiquidityPoolSchema
} from "@modules/databases"
import {
    BalanceSnapshotsNotFoundException,
    TokenNotFoundException,
    LiquidityPoolNotOwnedByBotException,
    QuoteRatioNotGoodException,
    CannotEnqueueOpenPositionJobException,
    CannotOpenPositionEnqueueJobReason,
    AbstractException
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
} from "mongoose"
import {
    DayjsService,
    InjectSuperJson
} from "@modules/mixin"
import SuperJSON from "superjson"
import _ from "lodash"
import {
    InjectQueue 
} from "@nestjs/bullmq"
import {
    bullData, BullQueueName 
} from "@modules/bullmq"
import {
    Job,
    Queue 
} from "bullmq"
import {
    OpenPositionPayload 
} from "../../types"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"
import {
    DynamicLiquidityPoolInfoCacheResult 
} from "@modules/cache"

export interface EnqueueOpenPositionParams {
    bot: BotSchema
    liquidityPool: LiquidityPoolSchema
    jobId: string
    isRetry?: boolean
    dynamicLiquidityPoolInfo?: DynamicLiquidityPoolInfoCacheResult
}

@Injectable()
export class OpenPositionEnqueueService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly quoteRatioService: QuoteRatioService,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly dayjsService: DayjsService,
        @InjectQueue(bullData[BullQueueName.OpenPosition].name)
        private readonly openPositionQueue: Queue<string>,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
    ) { }

    /**
     * === Error-handling convention (DEX orchestrators) ===
     *
     * This file follows a staged error pattern to make failures predictable:
     * - Input validation: required params are missing/invalid (throw immediately)
     * - State validation: bot/pool/dex state is missing or inconsistent (throw immediately)
     * - On-chain / data fetch: fetching required dynamic state fails (throws from called service)
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
            dynamicLiquidityPoolInfo,
        }: EnqueueOpenPositionParams,
    ): Promise<Job<string>> {
        /**
         * Add open position job to the queue
         */
        try {
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
                throw new LiquidityPoolNotOwnedByBotException(
                    {
                        botId: bot.id,
                        liquidityPoolId: liquidityPool.displayId,
                    }
                )
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
                throw new QuoteRatioNotGoodException(
                    {
                        botId: bot.id,
                        liquidityPoolId: liquidityPool.displayId,
                        quoteRatio: quoteRatio.toNumber(),
                    }
                )
            }
            if (!isRetry) {
                // start a session
                const session = await this.connection.startSession()
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
                                            liquidityPool: liquidityPool.id,
                                            jobType: JobType.OpenPosition,
                                            queuedAt: this.dayjsService.now().toDate(),
                                        },
                                    } 
                                },
                                {
                                    session 
                                }
                            )             
                    }
                )
            }
            // check if the job is already in the queue
            const jobInQueue = await this.openPositionQueue.getJob(bot.id)
            if (jobInQueue) {
                this.winstonService.log(
                    WinstonLog.OpenPositionJobAlreadyEnqueued,
                    {
                        jobId,
                        botId: bot.id,
                        liquidityPoolId: liquidityPool.displayId,
                    }
                )
                throw new CannotEnqueueOpenPositionJobException({
                    botId: bot.id,
                    liquidityPoolId: liquidityPool.displayId,
                    reason: CannotOpenPositionEnqueueJobReason.AlreadyInQueue,
                    jobId,
                })
            }
            const payload: OpenPositionPayload = {
                jobId,
                botId: bot.id,
                liquidityPoolId: liquidityPool.id,
                isRetry,
                dynamicLiquidityPoolInfo,
            }
            return await this.openPositionQueue.add(
                jobId,
                this.superjson.stringify(
                    payload
                ),
                {
                    jobId: bot.id,
                }
            ) 
        } catch (error) {
            // if the error is an abstract exception, throw it
            if (error instanceof AbstractException) {
                throw error
            }
            // otherwise, throw a new cannot enqueue open position job exception
            throw new CannotEnqueueOpenPositionJobException(
                {
                    botId: bot.id,
                    liquidityPoolId: liquidityPool.displayId,
                    reason: CannotOpenPositionEnqueueJobReason.RuntimeError,
                    jobId,
                    error: error.message,
                }
            )
        }
    }
}
