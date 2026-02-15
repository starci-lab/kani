import {
    Injectable 
} from "@nestjs/common"
import {
    WithdrawTaskConfirmParams 
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
export class WithdrawTaskConfirmService {
    constructor(
        private readonly winstonService: WinstonService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) { }

    /**
     * Process the WITHDRAW TASK CONFIRM step.
     * @param params - The parameters for the WITHDRAW TASK CONFIRM step.
     * @param params.bot - The bot.
     * @param params.job - The job.
     * @param params.taskIndex - The index of the task.
     */
    async process(
        {
            bot,
            job,
            taskIndex,
        }: WithdrawTaskConfirmParams
    ) {
        // simply logging
        this.winstonService.log(
            WinstonLog.ActionJobTaskConfirmed,
            {
                botId: bot.id,
                jobId: job.id,
                type: JobType.Withdraw,
                metadata: job.metadata,
                taskIndex,
                taskType: TaskType.Withdraw,
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
                        "task.type": TaskType.Withdraw,
                    },
                ],
            },
        )
    }
}