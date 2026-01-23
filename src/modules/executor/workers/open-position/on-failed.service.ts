import {
    Injectable,
} from "@nestjs/common"
import {
    UnrecoverableError,
} from "bullmq"
import {
    InjectPrimaryMongoose,
    JobSchema,
    JobStatus,
} from "@modules/databases"
import {
    DayjsService,
} from "@modules/mixin"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"
import {
    Connection,
} from "mongoose"
import {
    OnFailedParams,
} from "./types"

@Injectable()
export class OnFailedService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dayjsService: DayjsService,
        private readonly winstonService: WinstonService,
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

        if (isUnrecoverable) {
            this.winstonService.log(
                WinstonLog.OpenPositionProcessingFailedUnrecoverable,
                {
                    botId: bot.id,
                    jobId: job.id,
                    bullmqJobId: bullmqJob.id,
                    error: error.message,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
            await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                {
                    _id: job.id,
                },
                {
                    $set: {
                        status: JobStatus.Failed,
                        processedAt: this.dayjsService.now().toDate(),
                    },
                }
            )
        } else if (isPermanentFailure) {
            this.winstonService.log(
                WinstonLog.OpenPositionProcessingFailedPermanentFailure,
                {
                    botId: bot.id,
                    jobId: job.id,
                    bullmqJobId: bullmqJob.id,
                    error: error.message,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )

            await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                {
                    _id: job.id,
                },
                {
                    $set: {
                        status: JobStatus.Failed,
                        processedAt: this.dayjsService.now().toDate(),
                    },
                    $inc: {
                        retryCount: 1,
                    },
                }
            )
        } else {
            this.winstonService.log(
                WinstonLog.OpenPositionProcessingFailedRetryable,
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


