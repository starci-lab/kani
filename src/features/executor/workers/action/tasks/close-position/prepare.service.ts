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
    JobTaskService,
} from "../../update"
import {
    DebugContextService,
} from "../debug-context.service"
import {
    DebugLatencyService,
} from "@modules/debug"

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
        private readonly debugContextService: DebugContextService,
        private readonly debugLatencyService: DebugLatencyService,
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
        const contextPayload = this.debugContextService.createContextPayload({
            jobType: JobType.ClosePosition,
            jobId: job.id,
            botId: bot.id,
        })
        try {
            await this.debugLatencyService.createContext(contextPayload)
            await this.sendHeartbeatService.process(
                {
                    bot,
                    job,
                    bullmqJob,
                },
            )
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "heartbeat",
            })
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
            await this.debugLatencyService.createContext(contextPayload)
            const prepareResult =
                await this.closePositionActionService.prepare(
                    {
                        bot,
                        liquidityPool,
                        state,
                    },
                )
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "prepare",
            })
            await this.debugLatencyService.createContext(contextPayload)
            await this.jobTaskService.upsertPreparedTask({
                jobId: job.id,
                taskType: TaskType.ClosePosition,
                taskIndex,
                prepareResult,
            })
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "upsertPreparedTask",
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