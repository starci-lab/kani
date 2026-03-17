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
    ActionJobTaskPrepareMaxRetriesException,
    JobFailureException,
} from "@modules/exceptions"
import {
    JobTaskService 
} from "../../update"
import {
    DebugContextService,
} from "../debug-context.service"
import {
    DebugLatencyService,
} from "@modules/debug"
import {
    RetryService 
} from "@modules/mixin"
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
        private readonly debugContextService: DebugContextService,
        private readonly debugLatencyService: DebugLatencyService,
        private readonly retryService: RetryService,
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
            // check retries
            const retries = job.tasks?.[taskIndex]?.retries ?? 0
            const maxRetries = envConfig().executor.workers.job.prepare.maxRetries
            if (retries >= maxRetries) {
                throw new JobFailureException({
                    originalError: new ActionJobTaskPrepareMaxRetriesException({
                        maxRetries,
                        botId: bot.id,
                        jobId: job.id,
                        metadata: job.metadata,
                        jobType,
                        taskType: TaskType.OpenPosition,
                        taskIndex,
                    }),
                    strategy: JobFailureStrategy.Fatal,
                })
            }
            const prepareResult = await this.retryService.retry({
                action: async () => {
                    return await this.openPositionActionService.prepare(
                        {
                            bot,
                            liquidityPool,
                            state,
                        },
                    )
                },
                options: {
                    retries: envConfig().executor.workers.job.prepare.maxAttempts,
                    minTimeout: envConfig().executor.workers.job.prepare.minTimeout,
                    maxTimeout: envConfig().executor.workers.job.prepare.maxTimeout,
                    onFailedAttempt: async (context) => {
                        // log the failed attempt
                        this.winstonService.log(
                            WinstonLog.ActionJobPrepareFailedAttempt,
                            {
                                botId: bot.id,
                                jobId: job.id,
                                jobType,
                                taskIndex,
                                taskType: TaskType.OpenPosition,
                                metadata: job.metadata,
                                attemptsMade: context.attemptNumber,
                                error: context.error?.message ?? "unknown",
                            }
                        )
                    },
                },
            })
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
                    jobType,
                    txCount: prepareResult.prepareTxs.length,
                    metadata: job.metadata,
                    taskIndex,
                    taskType: TaskType.OpenPosition,
                }
            )
        } catch (error) {
            // log the failed task
            this.winstonService.log(
                WinstonLog.ActiveJobTaskPreparedFailed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    jobType,
                    error: error.message,
                    taskIndex,
                    taskType: TaskType.OpenPosition,
                    metadata: job.metadata,
                }
            )
            // throw prepare failed exception
            throw new JobFailureException(
                {
                    originalError: error,
                    strategy: JobFailureStrategy.Fatal,
                }
            )
        }
    }
}