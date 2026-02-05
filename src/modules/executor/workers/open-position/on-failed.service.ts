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

@Injectable()
export class OnFailedService {
    constructor(
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


