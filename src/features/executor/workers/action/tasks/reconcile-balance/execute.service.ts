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
    ) { }

    /**
   * Process the Reconcile Balance Task EXECUTE step.
   */
    async process({
        bot,
        job,
        bullmqJob,
        taskIndex,
    }: ReconcileBalanceTaskExecuteParams) {
        // active step index
        const stepIndex = job.tasks[taskIndex].activeStep ?? 0
        // step snapshot (may be undefined)
        const step = job.tasks[taskIndex].steps?.[stepIndex]
        // execute retries
        const executeRetries = step?.executeRetries ?? 0
        // execute max retries
        const executeMaxRetries = envConfig().executor.workers.job.txExecuteMaxRetries
        // sign retries
        const signRetries = step?.signRetries ?? 0
        // sign max retries
        const signMaxRetries = envConfig().executor.workers.job.txSignMaxRetries
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
                    txCheck: executeRetries > 0,
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
                // if execute retries is less than execute max retries, increment the execute retries
                if (executeRetries < executeMaxRetries) {
                    // update execute retries
                    await this.jobStepService.updateExecuteRetries({
                        jobId: job.id,
                        taskType: TaskType.ReconcileBalance,
                        taskIndex,
                        stepIndex,
                    })
                    return
                }
                // if tx failure index is greater than or equal to max attempts, throw a job failure exception
                if (signRetries < signMaxRetries) {
                    await this.jobStepService.rollbackToSign({
                        jobId: job.id,
                        taskType: TaskType.ReconcileBalance,
                        taskIndex,
                        stepIndex,
                        error,
                    })
                }
                await this.jobStepService.rollbackToPrepared({
                    jobId: job.id,
                    taskIndex,
                })
                return
            }
        }
    }
}
