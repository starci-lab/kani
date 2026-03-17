import {
    Injectable
} from "@nestjs/common"
import {
    SignedTx, BalanceActionService
} from "@modules/blockchains"
import {
    TaskType,
} from "@modules/databases"
import {
    InjectSuperJson
} from "@modules/mixin"
import SuperJSON from "superjson"
import {
    ReconcileBalanceTaskExecuteParams
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
} from "@modules/common"
import {
    JobStepService,
} from "../../update"
import {
    WinstonService,
    WinstonLog,
} from "@modules/winston"
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
 * Service for the Reconcile Balance Task EXECUTE step.
 */
@Injectable()
export class ReconcileBalanceTaskExecuteService {
    constructor(
        private readonly balanceActionService: BalanceActionService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly sendHeartbeatService: SendHeartbeatService,
        private readonly jobStepService: JobStepService,
        private readonly winstonService: WinstonService,
        private readonly debugContextService: DebugContextService,
        private readonly retryService: RetryService,
        private readonly debugLatencyService: DebugLatencyService,
    ) { }

    /**
   * Process the Reconcile Balance Task EXECUTE step.
   */
    async process({
        bot,
        job,
        bullmqJob,
        taskIndex,
        jobType,
    }: ReconcileBalanceTaskExecuteParams) {
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
                        taskIndex,
                        stepIndex,
                    }),
                    strategy: JobFailureStrategy.Fatal,
                })
            }
            const executeResult = await this.retryService.retry(
                {
                    action: async () => {
                        return await this.balanceActionService.executeReconcileBalanceTransaction({
                            bot,
                            txCheck: true,
                            stimulate:
                        envConfig().executor.runtime.operation.reconcileBalance.stimulate,
                            signedTx: this.superJson.parse<SignedTx>(signedTx),
                        })
                    },
                    options: {
                        retries: envConfig().executor.workers.job.execute.maxAttempts,
                        minTimeout: envConfig().executor.workers.job.execute.minTimeout,
                        maxTimeout: envConfig().executor.workers.job.execute.maxTimeout,
                        onFailedAttempt: async (context) => {
                            this.winstonService.log(
                                WinstonLog.ActionJobTaskStepExecuteFailedAttempt,
                                {
                                    botId: bot.id,
                                    jobId: job.id,
                                    jobType,
                                    taskIndex,
                                    taskType: TaskType.ReconcileBalance,
                                    stepIndex,
                                    metadata: job.metadata,
                                    attemptsMade: context.attemptNumber,
                                    error: context.error?.message ?? "unknown",
                                }
                            )
                        },
                    }
                }
            )
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Reconcile balance transaction executed successfully",
            })
            await this.jobStepService.setStepExecuteResultAndAdvance({
                jobId: job.id,
                taskType: TaskType.ReconcileBalance,
                taskIndex,
                stepIndex,
                executeResult: this.superJson.stringify(executeResult),
            })
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Execute result persisted successfully",
            })
            this.winstonService.log(
                WinstonLog.ActionJobTaskStepExecuted,
                {
                    botId: bot.id,
                    jobId: job.id,
                    jobType,
                    taskIndex,
                    taskType: TaskType.ReconcileBalance,
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
                    taskType: TaskType.ReconcileBalance,
                    stepIndex,
                    error: error.message,
                    metadata: job.metadata,
                }
            )
            // If tx execution failed with a fatal RPC error, rollback to Sign and record failure atomically.
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
                return
            }
            throw error
        }
    }
}
