import {
    Injectable
} from "@nestjs/common"
import {
    OpenPositionActionService,
} from "@modules/blockchains"
import {
    JobType,
    TaskType
} from "@modules/databases"
import {
    OpenPositionTaskPrepareParams
} from "../types"
import {
    SendHeartbeatService 
} from "../../send-heartbeat.service"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"
import {
    JobFailureStrategy 
} from "@modules/common"
import {
    ActionJobTaskPrepareMaxAttemptsException,
    JobFailureException, 
} from "@modules/exceptions"
import {
    JobTaskService 
} from "../../update"
import {
    InjectPrimaryMongoose
} from "@modules/databases"
import {
    Connection
} from "mongoose"
import {
    envConfig 
} from "@modules/env"
/**
 * Service for the Open Position Task PREPARE step.
 */
@Injectable()
export class OpenPositionTaskPrepareService {
    constructor(
        private readonly openPositionActionService: OpenPositionActionService,
        private readonly sendHeartbeatService: SendHeartbeatService,
        private readonly winstonService: WinstonService,
        private readonly jobTaskService: JobTaskService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) { }

    /**
     * Process the Open Position Task PREPARE step.
     *
     * @param params - The parameters for the step.
     * @returns The result of the step.
     */
    async process(
        {
            bot,
            job,
            liquidityPool,
            state,
            taskIndex,
            bullmqJob,
        }: OpenPositionTaskPrepareParams
    ) {
        try {
            // send heartbeat
            await this.sendHeartbeatService.process(
                {
                    bot,
                    job,
                    bullmqJob,
                    fatal: taskIndex === 0,
                }
            )
            // we check if the task has reached the maximum number of attempts
            const retries = job.tasks?.[taskIndex]?.retries ?? 0
            if (retries >= envConfig().executor.workers.job.prepareMaxAttempts) {
                throw new JobFailureException({
                    originalError: new ActionJobTaskPrepareMaxAttemptsException({
                        maxAttempts: envConfig().executor.workers.job.prepareMaxAttempts,
                        botId: bot.id,
                        jobId: job.id,
                        metadata: job.metadata,
                        type: TaskType.OpenPosition,
                    }),
                    strategy: taskIndex === 0 ? JobFailureStrategy.Fatal : JobFailureStrategy.Requeue,
                })
            }
            // we prepare the open position transaction.
            const prepareResult =
            await this.openPositionActionService.prepare(
                {
                    bot,
                    liquidityPool,
                    state,
                }
            )
            // We update the database with the prepare result.
            await this.jobTaskService.upsertPreparedTask({
                jobId: job.id,
                taskType: TaskType.OpenPosition,
                taskIndex,
                prepareResult,
            })
            this.winstonService.log(
                WinstonLog.ActiveJobTaskPrepared,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: JobType.OpenPosition,
                    txCount: prepareResult.prepareTxs.length,
                    metadata: job.metadata,
                    taskIndex,
                    taskType: TaskType.OpenPosition,
                }
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.ActiveJobTaskPreparedFailed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: JobType.OpenPosition,
                    error: error.message,
                    taskIndex,
                    taskType: TaskType.OpenPosition,
                    metadata: job.metadata,
                }
            )
            throw new JobFailureException(
                {
                    originalError: error,
                    strategy: JobFailureStrategy.Fatal,
                }
            )
        }
    }
}