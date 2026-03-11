import {
    Injectable
} from "@nestjs/common"
import {
    BotSchema,
    InjectPrimaryMongoose,
    JobSchema,
    JobStatus,
    JobType,
    TaskType,
} from "@modules/databases"
import {
    Connection,
    Types
} from "mongoose"
import {
    envConfig
} from "@modules/env"
import {
    ActionPayload
} from "../../types"
import SuperJSON from "superjson"
import {
    DayjsService, InjectSuperJson
} from "@modules/mixin"
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
    WinstonLog
} from "@modules/winston"
import {
    WinstonService
} from "@modules/winston"
import type {
    EnqueueClosePositionParams,
    ValidateClosePositionResult,
} from "./types"
import {
    ActivePositionAssociateService,
} from "@modules/databases"
import {
    LockAuthorityService,
} from "@modules/lock"
import {
    LiquidityPoolStateService,
} from "./liquidity-pool-state.service"
import {
    SettlementService
} from "../../settlement"
import {
    CacheKey,
    CacheService,
} from "@modules/cache"
import { 
    AsyncService 
} from "@modules/mixin"

/**
 * Service responsible for enqueuing close position jobs.
 * Validates preconditions and adds jobs to the queue.
 *
 * @example
 * const service = new ClosePositionEnqueueService(...)
 * const job = await service.enqueue({ bot, liquidityPool, job })
 */
@Injectable()
export class ClosePositionEnqueueService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectQueue(bullData[BullQueueName.Action].name)
        private readonly actionQueue: Queue<string>,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly dayjsService: DayjsService,
        private readonly winstonService: WinstonService,
        private readonly activePositionAssociateService: ActivePositionAssociateService,
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        private readonly settlementService: SettlementService,
        private readonly lockAuthorityService: LockAuthorityService,
        private readonly cacheService: CacheService,
        private readonly asyncService: AsyncService,
    ) { }

    /**
     * Enqueue a close position job.
     * 
     * Side effects:
     * - Persists the job record
     * - Enqueues the job in the queue
     */
    async enqueue(
        params: EnqueueClosePositionParams,
    ) {
        const {
            bot,
            liquidityPool,
            oldJob,
            isRetry,
            positionSettlements
        } = params
        // Attach associated positions to the bot's active position
        await this.activePositionAssociateService
            .attachAssociatedPositionsToBotActivePositions({
                bots: [bot],
            }
            )
        // Validate the close position job and get positionSettlements when valid
        const { 
            isValid, 
            positionSettlements: validatedPositionSettlements,
        } = await this.validate(params)
        if (!isValid) {
            return
        }
        const _positionSettlements = (isRetry ? positionSettlements : validatedPositionSettlements) ?? []
        try {
            let jobId = oldJob?.id
            if (!isRetry) {
                jobId = new Types.ObjectId().toString()
                // Persist job record + set bot activeJob + enqueue in one transaction (same pattern as open-position).
                const session = await this.connection.startSession()
                await session.withTransaction(
                    async () => {
                        const [jobRaw] = await this.connection.model<JobSchema>(
                            JobSchema.name
                        ).create(
                            [
                                {
                                    _id: jobId,
                                    liquidityPool: liquidityPool.id,
                                    bot: bot.id,
                                    executor: envConfig().executor.id,
                                    type: JobType.ClosePosition,
                                    status: JobStatus.Running,
                                    tasks: [
                                    ],
                                    metadata: {
                                        liquidityPoolId: liquidityPool.displayId,
                                    },
                                }
                            ],
                            {
                                session,
                            }
                        )
                        const job = jobRaw.toJSON<JobSchema>()
                        await this.connection.model<BotSchema>(BotSchema.name).updateOne(
                            {
                                _id: bot.id,
                            },
                            {
                                $set: {
                                    activeJob: {
                                        job: job.id,
                                        liquidityPool: liquidityPool.id,
                                        jobType: JobType.ClosePosition,
                                        queuedAt: this.dayjsService.now().toDate(),
                                    },
                                },
                            },
                            {
                                session,
                            }
                        )
                    }
                )
            }
            const payload: ActionPayload = {
                jobId: jobId ?? "",
                botId: bot.id,
                type: JobType.ClosePosition,
                isRetry,
                tasks: [
                    {
                        /** Close position task */
                        type: TaskType.ClosePosition,
                        payload: {
                            /** Payload for close position task */
                            liquidityPoolId: liquidityPool.id,
                            positionSettlements: _positionSettlements,
                        },
                    },
                    {
                        /** Reconcile balance task */
                        type: TaskType.ReconcileBalance,
                        payload: {
                            /** Payload for reconcile balance task */
                            swap: true,
                            reconcile: false,
                        },
                    },
                    {
                        /** Transfer fees task */
                        type: TaskType.TransferFees,
                        payload: {
                            /** Payload for transfer fees task */
                            reconcile: false,
                        },
                    },
                ],
            }
            await this.actionQueue.add(
                bot.id,
                this.superjson.stringify(payload),
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
                        type: JobType.ClosePosition,
                        liquidityPoolId: liquidityPool.displayId,
                    }
                )
            } else {
                this.winstonService.log(
                    WinstonLog.JobRequeued,
                    {
                        jobId: jobId ?? "",
                        botId: bot.id,
                        type: JobType.ClosePosition,
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
                        type: JobType.ClosePosition,
                        liquidityPoolId: liquidityPool.displayId,
                        error: error.message,
                    }
                )
            } else {
                this.winstonService.log(
                    WinstonLog.JobRequeueFailed,
                    {
                        jobId: oldJob?.id ?? "",
                        botId: bot.id,
                        type: JobType.ClosePosition,
                        liquidityPoolId: liquidityPool.displayId,
                        error: error.message,
                    }
                )
            }
            this.lockAuthorityService.release(
                {
                    botId: bot.id,
                }
            )
        }
    }

    /**
     * Validate the close position job.
     * 
     * @param bot - The bot.
     * @param liquidityPool - The liquidity pool.
     * @param oldJob - The old job.
     * @returns True if the job is valid, false otherwise.
     */
    private async validate(
        params: EnqueueClosePositionParams,
    ): Promise<ValidateClosePositionResult> {
        const { bot, liquidityPool, oldJob, isRetry } = params
        let positionSettlements = params.positionSettlements ?? []
        // Ensure the bot has an active position
        if (!bot.activePosition && !isRetry) {
            this.winstonService.log(
                WinstonLog.JobSkippedBotNotHasActivePosition,
                {
                    botId: bot.id,
                    type: JobType.ClosePosition,
                    liquidityPoolId: liquidityPool.displayId,
                    jobId: oldJob?.id,
                }
            )
            return {
                isValid: false,
            }
        }
        // Skip if bot position is closed
        if (bot.activePosition?.positionClosed && !isRetry) {
            this.winstonService.log(
                WinstonLog.JobSkippedBotPositionClosed,
                {
                    botId: bot.id,
                    type: JobType.ClosePosition,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
            return {
                isValid: false,
            }
        }
        // Skip if bot has an active job
        if (bot.activeJob && !isRetry) {
            this.winstonService.log(
                WinstonLog.JobSkippedBotAlreadyHasActiveJob,
                {
                    botId: bot.id,
                    jobId: bot.activeJob.job.toString(),
                    type: JobType.ClosePosition,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
            return {
                isValid: false,
            }
        }
        // Retrieve the latest pool state
        const state = await this.liquidityPoolStateService.getState(liquidityPool)
        if (!isRetry) {
            // Run settlement logic to determine whether position should close
            const settlement = await this.settlementService.settle(
                {
                    bot,
                    liquidityPool,
                    state,
                }
            )
            positionSettlements = settlement.positionSettlements
            // cache to Redis for requeue to reuse
            this.asyncService.safeRun( 
                async () => await this.cacheService.set(
                    {
                        key: CacheKey.ClosePositionSettlements,
                        args: [bot.id],
                        cacheResult: positionSettlements,
                    }
                )
            )
            // if settle is enabled, we check if the position can be settled
            const settleEnabled =
                envConfig().executor.runtime.operation.closePosition.settle.enabled
            // if the position is not settled and the bot has an active position and the position is not forced to close and the job is not a retry and settle is enabled, we skip the job
            if (
                (!settlement.settled) &&
                (!bot.activePosition?.forceClose) &&
                settleEnabled
            ) {
                this.winstonService.log(
                    WinstonLog.JobSkippedCannotSettlePosition,
                    {
                        botId: bot.id,
                        liquidityPoolId: liquidityPool.displayId,
                        type: JobType.ClosePosition,
                        jobId: oldJob?.id,
                    }
                )
                return {
                    isValid: false,
                }
            }
        }
        // Ensure there is no existing job in the queue for this bot
        const bullmqJob = await this.actionQueue.getJob(bot.id)
        if (bullmqJob) {
            this.winstonService.log(
                WinstonLog.JobSkippedFoundInQueue,
                {
                    botId: bot.id,
                    type: JobType.ClosePosition,
                    liquidityPoolId: liquidityPool.displayId,
                    bullmqJobId: bullmqJob.id ?? "",
                    jobId: oldJob?.id,
                }
            )
            return {
                isValid: false,
            }
        }
        // Acquire lock authority to prevent concurrent execution
        const acquired = await this.lockAuthorityService.acquire({
            botId: bot.id,
        })
        if (!acquired) {
            this.winstonService.log(
                WinstonLog.JobSkippedBotAuthorityNotAcquired,
                {
                    botId: bot.id,
                    jobId: oldJob?.id,
                    type: JobType.ClosePosition,
                }
            )
            return {
                isValid: false,
            }
        }
        return {
            isValid: true,
            positionSettlements,
        }
    }
}
