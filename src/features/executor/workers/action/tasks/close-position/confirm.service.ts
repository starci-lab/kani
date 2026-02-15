import {
    Injectable 
} from "@nestjs/common"
import {
    ClosePositionTaskConfirmParams 
} from "../types"
import {
    WinstonService, WinstonLog 
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

@Injectable()
export class ClosePositionTaskConfirmService {
    constructor(
        private readonly winstonService: WinstonService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) { }

    /**
     * Process the CLOSE POSITION TASK CONFIRM step.
     * @param params - The parameters for the CLOSE POSITION TASK CONFIRM step.
     * @param params.bot - The bot.
     * @param params.job - The job. 
     * @param params.state - The state of the liquidity pool.
     * @param params.isRetry - Whether the task is being retried.
     * @param params.taskIndex - The index of the task.
     */
    async process(
        {
            bot,
            job,
            taskIndex,
        }: ClosePositionTaskConfirmParams
    ) {
        // simply logging
        this.winstonService.log(
            WinstonLog.ActionJobTaskConfirmed,
            {
                botId: bot.id,
                jobId: job.id,
                type: JobType.ClosePosition,
                metadata: job.metadata,
                taskIndex,
            }
        )
        // update the job with the confirmed status
        await this.connection.model<JobSchema>(JobSchema.name).updateOne(
            {
                _id: job.id,
            },
            {
                $set: {
                    "tasks.$[task].confirmed": true,
                },
                $inc: {
                    taskIndex: 1,
                },
            },
            {
                arrayFilters: [
                    {
                        "task.index": taskIndex,
                        "task.type": TaskType.ClosePosition,
                    },
                ],
            },
        )
    }
}