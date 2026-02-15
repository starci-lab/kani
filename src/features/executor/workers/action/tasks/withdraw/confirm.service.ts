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
import {
    envConfig 
} from "@modules/env"
import {
    ActionJobStimulateMongoSessionException 
} from "@modules/exceptions"
import {
    SendHeartbeatService 
} from "../../send-heartbeat.service"
    
@Injectable()
export class WithdrawTaskConfirmService {
    constructor(
        private readonly winstonService: WinstonService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly sendHeartbeatService: SendHeartbeatService,
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
            bullmqJob
        }: WithdrawTaskConfirmParams
    ) {
        await this.sendHeartbeatService.process(
            {
                bot,
                job,
                bullmqJob,
            }
        )
        try {
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
            // throw an exception to stimulate the mongo session
            if (envConfig().executor.runtime.operation.withdraw.stimulate) {
                throw new ActionJobStimulateMongoSessionException({
                    botId: bot.id,
                    jobId: job.id,
                    taskIndex,
                })
            }
        } catch (error) {
            if (!(error instanceof ActionJobStimulateMongoSessionException)) {
                throw error
            }
        }
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
    }
}