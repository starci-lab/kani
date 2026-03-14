import {
    Injectable
} from "@nestjs/common"
import {
    OpenPositionActionService,
} from "@modules/blockchains"
import {
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
    envConfig,
} from "@modules/env"
import {
    DebugContextService,
} from "../debug-context.service"
import {
    DebugLatencyService,
} from "@modules/debug"

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
        private readonly debugContextService: DebugContextService,
        private readonly debugLatencyService: DebugLatencyService,
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
            jobType,
        }: OpenPositionTaskPrepareParams
    ) {
        const contextPayload = this.debugContextService.createContextPayload({
            jobType,
            jobId: job.id,
            botId: bot.id,
        })
        try {
            await this.sendHeartbeatService.process(
                {
                    bot,
                    job,
                    bullmqJob,
                },
            )
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Heartbeat sent successfully",
            })
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
                    strategy: JobFailureStrategy.Fatal,
                })
            }
            const prepareResult =
                await this.openPositionActionService.prepare(
                    {
                        bot,
                        liquidityPool,
                        state,
                    },
                )
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Prepare open position transaction successfully",
            })
            await this.jobTaskService.upsertPreparedTask({
                jobId: job.id,
                taskType: TaskType.OpenPosition,
                taskIndex,
                prepareResult,
            })
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Upsert prepared task successfully",
            })
            this.winstonService.log(
                WinstonLog.ActiveJobTaskPrepared,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: jobType,
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
                    type: jobType,
                    error: error.message,
                    taskIndex,
                    taskType: TaskType.OpenPosition,
                    metadata: job.metadata,
                }
            )
            const prepareProcessingRetries = job.tasks[taskIndex].prepareProcessingRetries ?? 0
            if (prepareProcessingRetries >= envConfig().executor.workers.job.txPrepareProcessingMaxRetries) {
                throw new JobFailureException({
                    originalError: error,
                    strategy: JobFailureStrategy.Fatal,
                })
            }
            await this.jobTaskService.updatePrepareProcessingRetries({
                jobId: job.id,
                taskIndex,
            })
        }
    }
}