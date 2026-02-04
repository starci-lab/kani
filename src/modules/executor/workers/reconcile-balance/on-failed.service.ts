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

@Injectable()
export class OnFailedService {
    constructor(
        private readonly winstonService: WinstonService,
    ) {}

    /**
     * Failure handler for reconcile-balance processing.
     *
     * Classifies failures into:
     * - unrecoverable (BullMQ `UnrecoverableError`): mark job FAILED immediately
     * - permanent (attempts exhausted): mark job FAILED and increment retryCount
     * - retryable: log as retrying and let BullMQ retry
     *
     * Always rethrows the original error so BullMQ can apply its retry/failure behavior.
     */
    async process(
        {
            job,
            bot,
            bullmqJob,
            error,
        }: OnFailedParams
    ): Promise<never> {
        const maxAttempts = bullmqJob.opts.attempts ?? 1
        const isPermanentFailure = bullmqJob.attemptsMade >= maxAttempts
        const isUnrecoverable = error instanceof UnrecoverableError

        if (isUnrecoverable) {
            this.winstonService.log(
                WinstonLog.ReconcileBalanceJobFailedUnrecoverable,
                {
                    botId: bot.id,
                    jobId: job.id,
                    bullmqJobId: bullmqJob.id,
                    error: error.message,
                }
            )
        } else if (isPermanentFailure) {
            this.winstonService.log(
                WinstonLog.ReconcileBalanceJobFailedPermanentFailure,
                {
                    botId: bot.id,
                    jobId: job.id,
                    bullmqJobId: bullmqJob.id,
                    error: error.message,
                }
            )
        } else {
            this.winstonService.log(
                WinstonLog.ReconcileBalanceJobFailedRetryable,
                {
                    botId: bot.id,
                    jobId: job.id,
                    bullmqJobId: bullmqJob.id,
                    error: error.message,
                    attemptsMade: bullmqJob.attemptsMade,
                }
            )
        }
        throw error
    }
}


