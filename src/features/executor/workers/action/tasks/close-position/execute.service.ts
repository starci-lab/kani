import {
    Injectable 
} from "@nestjs/common"
import {
    ClosePositionActionService, SignedTx 
} from "@modules/blockchains"
import {
    TaskType,
} from "@modules/databases"
import {
    InjectSuperJson 
} from "@modules/mixin"
import SuperJSON from "superjson"
import {
    ClosePositionTaskExecuteParams 
} from "../types"
import {
    SendHeartbeatService 
} from "../../send-heartbeat.service"
import {
    JobFailureException,
    RpcClientFatalException,
    SignedTxNotFoundException,
} from "@modules/exceptions"
import {
    envConfig 
} from "@modules/env"
import {
    JobFailureStrategy,
    sleep,
} from "@modules/common"
import {
    WinstonService,
    WinstonLog,
} from "@modules/winston"
import {
    JobStepService,
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
 * Service for the Close Position Task EXECUTE step.
 */
@Injectable()
export class ClosePositionTaskExecuteService {
    constructor(
        private readonly closePositionActionService: ClosePositionActionService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly sendHeartbeatService: SendHeartbeatService,
        private readonly winstonService: WinstonService,
        private readonly jobStepService: JobStepService,
        private readonly debugContextService: DebugContextService,
        private readonly debugLatencyService: DebugLatencyService,
        private readonly retryService: RetryService,
    ) {}

    /**
   * Process the CLOSE POSITION TASK EXECUTE step.
   */
    async process({
        bot,
        job,
        liquidityPool,
        state,
        bullmqJob,
        taskIndex,
        jobType,
    }: ClosePositionTaskExecuteParams) {
        const contextPayload = this.debugContextService.createContextPayload({
            jobType,
            jobId: job.id,
            botId: bot.id,
        })
        const stepIndex = job.tasks[taskIndex].activeStep ?? 0
        const step = job.tasks[taskIndex].steps?.[stepIndex]
        try {
            await this.sendHeartbeatService.process({
                bot,
                job,
                bullmqJob,
            })
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Heartbeat sent successfully",
            })
            const signedTx = step?.signedTx
            if (!signedTx) {
                throw new JobFailureException({
                    originalError: new SignedTxNotFoundException({
                        botId: bot.id,
                        jobId: job.id,
                        liquidityPoolId: liquidityPool.displayId,
                        taskIndex,
                        stepIndex,
                    }),
                    strategy: JobFailureStrategy.Fatal,
                })
            }
            const executeResult = await this.retryService.retry({
                action: async () => {
                    return await this.closePositionActionService.execute(
                        {
                            bot,
                            state,
                            txCheck: true,
                            liquidityPool,
                            signedTx: this.superJson.parse<SignedTx>(signedTx),
                            stimulate: envConfig().executor.runtime.operation.closePosition.stimulate,
                        }
                    )
                },
                options: {
                    retries: envConfig().executor.workers.job.execute.maxAttempts,
                    minTimeout: envConfig().executor.workers.job.execute.minTimeout,
                    maxTimeout: envConfig().executor.workers.job.execute.maxTimeout,
                    onFailedAttempt: async (context) => {
                        // log the failed attempt
                        this.winstonService.log(
                            WinstonLog.ActionJobTaskStepExecuteFailedAttempt,
                            {
                                botId: bot.id,
                                jobId: job.id,
                                jobType,
                                taskIndex,
                                taskType: TaskType.ClosePosition,
                                stepIndex,
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
                description: "Execute transaction successfully",
            })
            await this.jobStepService.setStepExecuteResultAndAdvance({
                jobId: job.id,
                taskType: TaskType.ClosePosition,
                taskIndex,
                stepIndex,
                executeResult: this.superJson.stringify(executeResult),
            })
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Persist execute result successfully",
            })
            this.winstonService.log(
                WinstonLog.ActionJobTaskStepExecuted,
                {
                    botId: bot.id,
                    jobId: job.id,
                    jobType,
                    taskIndex,
                    taskType: TaskType.ClosePosition,
                    stepIndex,
                    metadata: job.metadata,
                }
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.ActionJobTaskStepExecutedFailed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    jobType,
                    taskIndex,
                    taskType: TaskType.ClosePosition,
                    stepIndex,
                    error: error.message,
                    metadata: job.metadata,
                }
            )
            if (error instanceof RpcClientFatalException) {
                await this.jobStepService.rollbackToPrepared(
                    {
                        jobId: job.id,
                        taskIndex,
                    }
                )       
                this.debugLatencyService.measure({
                    id: contextPayload.id,
                    description: "Rollback to prepared successful",
                })
                await sleep(envConfig().executor.workers.job.execute.retryDelay)
                return
            }
            throw error
        }
    }
}