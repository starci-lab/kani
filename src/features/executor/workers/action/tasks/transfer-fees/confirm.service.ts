import {
    Injectable
} from "@nestjs/common"
import {
    TransferFeesTaskConfirmParams
} from "../types"
import {
    WinstonService,
    WinstonLog
} from "@modules/winston"
import {
    InjectPrimaryMongoose,
    JobSchema,
    JobType,
    TaskType
} from "@modules/databases"
import {
    Connection
} from "mongoose"
import {
    envConfig
} from "@modules/env"
import {
    ActionJobStimulateMongoSessionException
} from "@modules/exceptions"
import {
    SendHeartbeatService
} from "../../send-heartbeat.service"
import {
    strict as assert
} from "node:assert"

/**
 * Service for the Transfer Fees Task CONFIRM step.
 */
@Injectable()
export class TransferFeesTaskConfirmService {
    constructor(
        private readonly winstonService: WinstonService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly sendHeartbeatService: SendHeartbeatService,
    ) {}

    /**
     * Process the Transfer Fees Task CONFIRM step.
     */
    async process({
        bot,
        job,
        taskIndex,
        bullmqJob,
    }: TransferFeesTaskConfirmParams) {
        try {
            await this.sendHeartbeatService.process({
                bot,
                job,
                bullmqJob,
            })

            try {
                const session = await this.connection.startSession()

                await session.withTransaction(async (clientSession) => {
                    const updateJobResult = await this.connection
                        .model<JobSchema>(JobSchema.name)
                        .updateOne(
                            {
                                _id: job.id 
                            },
                            {
                                $set: {
                                    "tasks.$[task].confirmed": true 
                                },
                                $inc: {
                                    taskIndex: 1 
                                },
                            },
                            {
                                arrayFilters: [
                                    {
                                        "task.index": taskIndex, "task.type": TaskType.TransferFees 
                                    },
                                ],
                                session: clientSession,
                            },
                        )

                    assert(updateJobResult.matchedCount > 0)

                    if (envConfig().executor.runtime.operation?.withdraw?.stimulate) {
                        throw new ActionJobStimulateMongoSessionException({
                            botId: bot.id,
                            jobId: job.id,
                            taskIndex,
                        })
                    }
                })
            } catch (error) {
                if (!(error instanceof ActionJobStimulateMongoSessionException)) {
                    throw error
                }
            }

            this.winstonService.log(
                WinstonLog.ActionJobTaskConfirmed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: job.type ?? JobType.OpenPosition,
                    metadata: job.metadata,
                    taskIndex,
                    taskType: TaskType.TransferFees,
                }
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.ActionJobTaskConfirmedFailed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: job.type ?? JobType.OpenPosition,
                    error: error.message,
                    taskIndex,
                    taskType: TaskType.TransferFees,
                    metadata: job.metadata,
                }
            )
            throw error
        }
    }
}
