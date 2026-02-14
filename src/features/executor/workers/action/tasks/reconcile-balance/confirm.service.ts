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
    JobType 
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
     * @param params.liquidityPool - The liquidity pool.
     * @param params.state - The state of the liquidity pool.
     * @param params.isRetry - Whether the task is being retried.
     * @param params.taskIndex - The index of the task.
     */
    async process(
        {
            bot,
            job,
            liquidityPool,
        }: ClosePositionTaskConfirmParams
    ) {
        // simply logging
        this.winstonService.log(
            WinstonLog.ActionJobConfirmed,
            {
                botId: bot.id,
                jobId: job.id,
                liquidityPoolId: liquidityPool.displayId,
                type: JobType.ClosePosition,
                metadata: job.metadata,
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
            }
        )
    }
}