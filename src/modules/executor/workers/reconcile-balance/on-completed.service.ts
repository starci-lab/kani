import {
    Injectable,
} from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema,
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
    LockAuthorityService,
} from "../../runtimes/core"
import {
    OnCompletedParams,
} from "./types"

@Injectable()
export class OnCompletedService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dayjsService: DayjsService,
        private readonly lockAuthorityService: LockAuthorityService,
        private readonly winstonService: WinstonService,
    ) {}

    /**
     * Completion handler for reconcile-balance processing.
     *
     * Marks the job COMPLETED, clears the bot's `activeJob`, logs completion,
     * and releases the lock authority.
     */
    async process(
        {
            job,
            bot,
            bullmqJob,
        }: OnCompletedParams
    ): Promise<void> {
        const session = await this.connection.startSession()

        try {
            await session.withTransaction(
                async () => {
                    await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                        {
                            _id: job.id,
                        },
                        {
                            $set: {
                                status: JobStatus.Completed,
                                processedAt: this.dayjsService.now().toDate(),
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

                    this.winstonService.log(
                        WinstonLog.ReconcileBalanceProcessingCompleted,
                        {
                            botId: bot.id,
                            jobId: job.id,
                            bullmqJobId: bullmqJob.id,
                        }
                    )

                    await this.lockAuthorityService.release(
                        {
                            botId: bot.id,
                        }
                    )
                }
            )
        } finally {
            await session.endSession()
        }
    }
}


