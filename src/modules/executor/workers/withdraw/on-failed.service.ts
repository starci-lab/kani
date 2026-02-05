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
    AbstractException,
} from "@exceptions"
import {
    FatalError,
} from "../fatal"
import {
    JobSchema,
    JobStatus,
    InjectPrimaryMongoose,
    BotSchema,
} from "@modules/databases"
import {
    Connection,
} from "mongoose"

@Injectable()
export class OnFailedService {
    constructor(
        private readonly winstonService: WinstonService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) {}

    /**
     * Failure handler for withdraw processing.
     *
     * Classifies failures into:
     * - fatal (FatalError): log, mark job FAILED, unset bot.activeJob, throw UnrecoverableError
     * - unrecoverable (BullMQ `UnrecoverableError`): log and rethrow
     * - permanent (attempts exhausted): log and rethrow
     * - retryable: log and rethrow
     *
     * Always rethrows so BullMQ can apply its retry/failure behavior.
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
        const isFatal = error instanceof FatalError

        if (isFatal) {
            this.winstonService.log(
                WinstonLog.WithdrawJobFailedFatal,
                {
                    botId: bot.id,
                    jobId: job.id,
                    bullmqJobId: bullmqJob.id,
                    error: error.message,
                }
            )
            const session = await this.connection.startSession()
            await session.withTransaction(
                async () => {
                    await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                        {
                            _id: job.id,
                        },
                        {
                            $set: {
                                status: JobStatus.Failed,
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
                                activeJob: null,
                            },
                        },
                        {
                            session,
                        }
                    )
                },
            )
            throw new UnrecoverableError(error.message)
        }

        if (isUnrecoverable) {
            const originalError = AbstractException.fromJSON(error.message)
            this.winstonService.log(
                WinstonLog.WithdrawJobFailedUnrecoverable,
                {
                    botId: bot.id,
                    jobId: job.id,
                    bullmqJobId: bullmqJob.id,
                    error: originalError.message,
                }
            )
        } else if (isPermanentFailure) {
            this.winstonService.log(
                WinstonLog.WithdrawJobFailedPermanentFailure,
                {
                    botId: bot.id,
                    jobId: job.id,
                    bullmqJobId: bullmqJob.id,
                    error: error.message,
                }
            )
        } else {
            this.winstonService.log(
                WinstonLog.WithdrawJobFailedRetryable,
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
