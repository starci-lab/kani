import {
    Injectable
} from "@nestjs/common"
import {
    SignedTx, BalanceActionService
} from "@modules/blockchains"
import {
    InjectPrimaryMongoose,
    JobSchema,
    JobType,
    StepType,
    TaskType,
} from "@modules/databases"
import {
    Connection
} from "mongoose"
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
    JobFailureStrategy, sleep
} from "@modules/common"
import {
    JobStepService,
    JobTaskService,
} from "../../update"
import {
    WinstonService,
    WinstonLog,
} from "@modules/winston"
import {
    strict as assert
} from "node:assert"
/**
 * Service for the Reconcile Balance Task EXECUTE step.
 */
@Injectable()
export class ReconcileBalanceTaskExecuteService {
    constructor(
        private readonly balanceActionService: BalanceActionService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly sendHeartbeatService: SendHeartbeatService,
        private readonly jobStepService: JobStepService,
        private readonly winstonService: WinstonService,
        private readonly jobTaskService: JobTaskService,
    ) { }

    /**
   * Process the Reconcile Balance Task EXECUTE step.
   */
    async process({
        bot,
        job,
        isRetry,
        bullmqJob,
        taskIndex,
    }: ReconcileBalanceTaskExecuteParams) {
        // previous attempts from BullMQ
        const hasPreviousAttempts = bullmqJob.attemptsMade > 0
        // active step index
        const stepIndex = job.tasks[taskIndex].activeStep ?? 0
        // step snapshot (may be undefined)
        const step = job.tasks[taskIndex].steps?.[stepIndex]
        try {
            await this.sendHeartbeatService.process({
                bot,
                job,
                bullmqJob,
            })
            // signed tx
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
            // execute
            const executeResult =
                await this.balanceActionService.executeReconcileBalanceTransaction({
                    bot,
                    txCheck: (hasPreviousAttempts || isRetry) ?? false,
                    stimulate:
                        envConfig().executor.runtime.operation.reconcileBalance.stimulate,
                    signedTx: this.superJson.parse<SignedTx>(signedTx),
                })
            // persist execute result + move next step
            const updateJobResult = await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                {
                    _id: job.id
                },
                {
                    $set: {
                        "tasks.$[task].steps.$[step].executeResult":
                            this.superJson.stringify(executeResult),
                        "tasks.$[task].steps.$[step].type": StepType.Execute,
                    },
                    $inc: {
                        "tasks.$[task].activeStep": 1,
                    },
                },
                {
                    arrayFilters: [
                        {
                            "task.index": taskIndex,
                            "task.type": TaskType.ReconcileBalance,
                        },
                        {
                            "step.index": stepIndex,
                        },
                    ],
                },
            )
            assert(updateJobResult.matchedCount > 0)
            this.winstonService.log(
                WinstonLog.ActionJobTaskStepExecuted,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: JobType.ReconcileBalance,
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
                    type: JobType.ReconcileBalance,
                    taskIndex,
                    taskType: TaskType.ReconcileBalance,
                    stepIndex,
                    error: error.message,
                    metadata: job.metadata,
                }
            )
            // If tx execution failed with a fatal RPC error, rollback to Sign and record failure atomically.
            if (error instanceof RpcClientFatalException) {
                const retries = step?.retries ?? 0
                // if tx failure index is greater than or equal to max attempts, throw a job failure exception
                if (retries >= envConfig().executor.workers.job.txExecuteMaxAttempts) {
                    await this.jobTaskService.rollbackRemoveTaskByIndex(
                        {
                            jobId: job.id,
                            taskIndex,
                        }
                    )
                    return
                }
                // rollback to sign with failure
                await this.jobStepService.rollbackToSignWithFailure(
                    {
                        jobId: job.id,
                        taskType: TaskType.ReconcileBalance,
                        taskIndex,
                        stepIndex,
                        error,
                    }
                )
                // sleep for the retry interval
                await sleep(envConfig().executor.workers.job.retryInterval)
                return
            }

            throw error
        }
        this.winstonService.log(
            WinstonLog.ActionJobTaskStepExecuted,
            {
                botId: bot.id,
                jobId: job.id,
                type: JobType.ReconcileBalance,
                taskIndex,
                taskType: TaskType.ReconcileBalance,
                stepIndex,
            }
        )
    }
}
