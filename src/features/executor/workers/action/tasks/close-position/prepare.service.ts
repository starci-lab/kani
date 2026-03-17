import {
    Injectable
} from "@nestjs/common"
import {
    ClosePositionActionService,
} from "@modules/blockchains"
import {
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
    ActionJobTaskPrepareMaxRetriesException,
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
import {
    RetryService
} from "@modules/mixin"

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
        private readonly retryService: RetryService,
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
            jobType,
        }: ClosePositionTaskPrepareParams
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
            const maxRetries = envConfig().executor.workers.job.prepare.maxRetries
            if (retries >= maxRetries) {
                throw new JobFailureException({
                    originalError: new ActionJobTaskPrepareMaxRetriesException({
                        maxRetries,
                        botId: bot.id,
                        jobId: job.id,
                        metadata: job.metadata,
                        jobType,
                        taskType: TaskType.ClosePosition,
                        taskIndex,
                    }),
                    strategy: JobFailureStrategy.Fatal,
                })
            }
            const prepareResult =
                await this.retryService.retry({
                    action: async () => {
                        return await this.closePositionActionService.prepare(
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
                                    taskType: TaskType.ClosePosition,
                                    metadata: job.metadata,
                                    attemptsMade: context.attemptNumber,
                                    error: context.error?.message ?? "unknown",
                                }
                            )
                        },
                    },
                }
                )
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Prepare close position transaction successfully",
            })
            await this.jobTaskService.upsertPreparedTask({
                jobId: job.id,
                taskType: TaskType.ClosePosition,
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
                    taskType: TaskType.ClosePosition,
                }
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.ActiveJobTaskPreparedFailed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    jobType,
                    error: error.message,
                    taskIndex,
                    taskType: TaskType.ClosePosition,
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