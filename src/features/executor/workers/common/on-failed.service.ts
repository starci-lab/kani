import {
    Injectable,
} from "@nestjs/common"
import {
    UnrecoverableError,
} from "bullmq"
import {
    BullQueueName,
} from "@modules/bullmq"
import {
    JobFailureException,
    JobFailureStrategy,
} from "@modules/exceptions"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"
import type {
    OnFailedParams,
} from "./types"
import {
    JobSchema, 
    JobStatus, 
    InjectPrimaryMongoose,
    BotSchema
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    LockAuthorityService,
} from "../../bussiness"

/**
 * Service for handling job failure.
 */
@Injectable()
export class OnFailedService {
    constructor(
        private readonly winstonService: WinstonService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly lockAuthorityService: LockAuthorityService,
    ) {}

    /** Winston log event per queue. */
    private queueToLog(queueName: BullQueueName): WinstonLog {
        const map: Record<BullQueueName, WinstonLog> = {
            [BullQueueName.OpenPosition]: WinstonLog.OpenPositionJobFailed,
            [BullQueueName.ClosePosition]: WinstonLog.ClosePositionJobFailed,
            [BullQueueName.ReconcileBalance]: WinstonLog.ReconcileBalanceJobFailed,
            [BullQueueName.Withdraw]: WinstonLog.WithdrawJobFailed,
        }
        return map[queueName]
    }

    /**
     * Failure handler for worker job processing.
     *
     * Classifies failures into:
     * - JobFailureException Fatal: mark job FAILED in DB, throw UnrecoverableError to stop
     * - JobFailureException Retry/Requeue: log and rethrow for BullMQ to handle
     * - BullMQ UnrecoverableError: log and rethrow
     * - permanent (attempts exhausted): log and rethrow
     * - retryable: log and rethrow, BullMQ retries
     *
     * Always rethrows the original error so BullMQ can apply its retry/failure behavior.
     * Also logs contextual fields (e.g. `liquidityPoolId`) for faster debugging.
     * @param job - The job that failed.
     * @param bot - The bot that the job belongs to.
     * @param bullmqJob - The BullMQ job.
     * @param error - The error that caused the job to fail.
     * @param queueName - The name of the queue that the job belongs to.
     * @param liquidityPool - The liquidity pool that the job belongs to.
     * @returns A promise that resolves to never.
     */
    async process(
        {
            job,
            bot,
            bullmqJob,
            error,
            queueName,
            liquidityPool,
        }: OnFailedParams
    ): Promise<never> {
        // if typeof error is not the JobFailureException, we transform it to the JobFailureException
        if (!(error instanceof JobFailureException)) {
            error = new JobFailureException({
                originalError: error,
                strategy: JobFailureStrategy.Requeue,
            })
        }
        const maxAttempts = bullmqJob.opts.attempts ?? 1
        const hasReachedMaxAttempts = bullmqJob.attemptsMade >= maxAttempts
        // if has reached max attempts, we transform the error to the JobFailureException with the Requeue strategy
        // to let the job be requeued next time
        if (hasReachedMaxAttempts) {
            error = new JobFailureException({
                originalError: error,
                strategy: JobFailureStrategy.Requeue,
            })
        }
        // we handle the error based on the strategy
        const _error = error as JobFailureException
        switch (_error.strategy) {
        case JobFailureStrategy.Fatal: {
            // update the database to mark the job as failed
            const session = await this.connection.startSession()
            await session.withTransaction(
                async () => {
                    await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                        {
                            _id: job.id,
                        },
                        {
                            $set: {
                                status: JobStatus.Failed 
                            },
                        },
                        {
                            session,
                        }
                    )
                    await this.connection.model<BotSchema>(BotSchema.name).updateOne(
                        {
                            _id: bot.id,
                        },
                        {
                            $unset: {
                                activeJob: null 
                            },
                        },
                        {
                            session,
                        }
                    )
                }
            )
            // log the error
            this.winstonService.log(
                this.queueToLog(queueName),
                {
                    botId: bot.id,  
                    jobId: job.id,
                    bullmqJobId: bullmqJob.id,
                    error: _error.getOriginalError().message,
                    liquidityPoolId: liquidityPool?.displayId,
                    attemptsMade: bullmqJob.attemptsMade,
                    strategy: _error.strategy,
                }
            )
            // release the lock
            await this.lockAuthorityService.release({
                botId: bot.id,
            })
            // throw the error
            throw new UnrecoverableError(_error.getOriginalError().message)
        }
        case JobFailureStrategy.Retry:
        case JobFailureStrategy.Requeue: {
            this.winstonService.log(
                this.queueToLog(queueName),
                {
                    botId: bot.id,
                    jobId: job.id,
                    bullmqJobId: bullmqJob.id,
                    error: _error.getOriginalError().message,
                    liquidityPoolId: liquidityPool?.displayId,
                    attemptsMade: bullmqJob.attemptsMade,
                    strategy: _error.strategy,
                },
            )
            break
        }
        }
        throw error
    }
}


