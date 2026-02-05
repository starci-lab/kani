import {
    Injectable,
} from "@nestjs/common"
import {
    UnrecoverableError,
} from "bullmq"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"
import {
    OnFailedParams,
} from "./types"
import {
    AbstractException 
} from "@exceptions"
import {
    FatalError 
} from "../fatal"
import {
    JobSchema, 
    JobStatus, 
    InjectPrimaryMongoose,
    BotSchema
} from "@modules/databases"
import {
    Connection 
} from "mongoose"

@Injectable()
export class OnFailedService {
    constructor(
        private readonly winstonService: WinstonService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) {}

    /**
     * Failure handler for open-position processing.
     *
     * Classifies failures into:
     * - unrecoverable (BullMQ `UnrecoverableError`): mark job FAILED immediately
     * - permanent (attempts exhausted): mark job FAILED and increment retryCount
     * - retryable: log as retrying and let BullMQ retry
     *
     * Always rethrows the original error so BullMQ can apply its retry/failure behavior.
     * Also logs contextual fields (e.g. `liquidityPoolId`) for faster debugging.
     */
    async process(
        {
            job,
            bot,
            bullmqJob,
            error,
            liquidityPool,
        }: OnFailedParams
    ): Promise<never> {
        const maxAttempts = bullmqJob.opts.attempts ?? 1
        const isPermanentFailure = bullmqJob.attemptsMade >= maxAttempts
        const isUnrecoverable = error instanceof UnrecoverableError
        const isFatal = error instanceof FatalError
        // if the error is a fatal error, log the error and update the database to mark the job as failed
        // and throw UnrecoverableError to stop the job
        if (isFatal) {
            this.winstonService.log(
                WinstonLog.OpenPositionJobFailedFatal,
                {
                    botId: bot.id,
                    jobId: job.id,
                    bullmqJobId: bullmqJob.id,
                    error: error.message,
                }
            )
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
            throw new UnrecoverableError(error.message)
        } 
        // otherwise, based on the error type, log the error and update the database to mark the job as failed to retry next time
        if (isUnrecoverable) {
            const originalError = AbstractException.fromJSON(error.message)
            this.winstonService.log(
                WinstonLog.OpenPositionJobFailedUnrecoverable,
                {
                    botId: bot.id,
                    jobId: job.id,
                    bullmqJobId: bullmqJob.id,
                    error: originalError.message,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
        } else if (isPermanentFailure) {
            this.winstonService.log(
                WinstonLog.OpenPositionJobFailedPermanentFailure,
                {
                    botId: bot.id,
                    jobId: job.id,
                    bullmqJobId: bullmqJob.id,
                    error: error.message,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
        } else {
            this.winstonService.log(
                WinstonLog.OpenPositionJobFailedRetryable,
                {
                    botId: bot.id,
                    jobId: job.id,
                    bullmqJobId: bullmqJob.id,
                    error: error.message,
                    attemptsMade: bullmqJob.attemptsMade,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
        }
        throw error
    }
}


