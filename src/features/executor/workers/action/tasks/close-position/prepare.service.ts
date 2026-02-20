import {
    Injectable
} from "@nestjs/common"
import {
    ClosePositionActionService,
} from "@modules/blockchains"
import {

    JobType,
    TaskType
} from "@modules/databases"
import {
    ClosePositionTaskPrepareParams 
} from "../types"
import {
    SendHeartbeatService 
} from "../../send-heartbeat.service"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"
import {
    ActionJobTaskPrepareMaxAttemptsException,
    JobFailureException, 
} from "@modules/exceptions"
import {
    JobFailureStrategy 
} from "@modules/common"
import {
    envConfig 
} from "@modules/env"
import {
    JobTaskService
} from "../../update"
/**
 * Service for the Close Position Task PREPARE step.
 */
@Injectable()
export class ClosePositionTaskPrepareService {
    constructor(
        private readonly closePositionActionService: ClosePositionActionService,
        private readonly sendHeartbeatService: SendHeartbeatService,
        private readonly winstonService: WinstonService,
        private readonly jobTaskService: JobTaskService,
    ) { }

    /**
     * Process the Close Position Task PREPARE step.
     *
     * @param params - The parameters for the step.
     * @returns The result of the step.
     */
    async process(
        {
            bot,
            job,
            state,
            taskIndex,
            bullmqJob,
            liquidityPool,
        }: ClosePositionTaskPrepareParams
    ) {
        try {
            // send heartbeat
            await this.sendHeartbeatService.process(
                {
                    bot,
                    job,
                    bullmqJob,
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
                        type: TaskType.ClosePosition,
                    }),
                    strategy: JobFailureStrategy.Fatal,
                })
            }
            // We prepare the close position transaction.
            const prepareResult =
            await this.closePositionActionService.prepare(
                {
                    bot,
                    liquidityPool,
                    state,
                }
            )
            // We update the database with the prepare result.
            await this.jobTaskService.upsertPreparedTask({
                jobId: job.id,
                taskType: TaskType.ClosePosition,
                taskIndex,
                prepareResult,
            })
            this.winstonService.log(
                WinstonLog.ActiveJobTaskPrepared,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: JobType.ClosePosition,
                    txCount: prepareResult.prepareTxs.length,
                    metadata: job.metadata,
                    taskIndex,
                    taskType: TaskType.ClosePosition,
                }
            )
        } catch (error) 
        {
            this.winstonService.log(
                WinstonLog.ActiveJobTaskPreparedFailed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: JobType.ClosePosition,
                    error: error.message,
                    taskIndex,
                    taskType: TaskType.ClosePosition,
                    metadata: job.metadata,
                }
            )
            // log the error
            throw new JobFailureException(
                {
                    originalError: error,
                    strategy: JobFailureStrategy.Fatal,
                }
            )
        }
    }
}