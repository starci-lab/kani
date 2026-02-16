import {
    Injectable 
} from "@nestjs/common"
import {
    SignedTx, BalanceActionService 
} from "@modules/blockchains"
import {
    InjectPrimaryMongoose,
    JobSchema,
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
    ActionJobTaskTxSendMaxAttemptsException,
} from "@modules/exceptions"
import {
    envConfig 
} from "@modules/env"
import {
    JobFailureStrategy, sleep 
} from "@modules/common"
import {
    JobStepTransitionService 
} from "../../update"
    
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
    private readonly jobStepTransitionService: JobStepTransitionService,
    ) {}

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
        try {
            await this.sendHeartbeatService.process({
                bot,
                job,
                bullmqJob,
            })
            // previous attempts from BullMQ
            const hasPreviousAttempts = bullmqJob.attemptsMade > 0
            // active step index
            const stepIndex = job.tasks[taskIndex].activeStep ?? 0
            // step snapshot (may be undefined)
            const step = job.tasks[taskIndex].steps?.[stepIndex]
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
            try {
            // persist execute result + move next step
                await this.connection.model<JobSchema>(JobSchema.name).updateOne(
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
            } catch (error) {
            // If tx execution failed with a fatal RPC error, rollback to Sign and record failure atomically.
                if (error instanceof RpcClientFatalException) {
                    const retries = step?.retries ?? 0
                    const maxAttempts = envConfig().executor.workers.job.txSendMaxAttempts
                    // if tx failure index is greater than or equal to max attempts, throw a job failure exception
                    if (retries >= maxAttempts) {
                    // reset retries to 0 (same behavior as OpenPosition)
                        await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                            {
                                _id: job.id 
                            },
                            {
                                $set: {
                                    "tasks.$[task].steps.$[step].retries": 0,
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
                        throw new JobFailureException({
                            originalError: new ActionJobTaskTxSendMaxAttemptsException({
                                maxAttempts,
                                originalError: error,
                                botId: bot.id,
                                jobId: job.id,
                                // reconcile không có liquidityPoolId -> giữ API sạch, không truyền
                                metadata: job.metadata,
                                type: TaskType.ReconcileBalance,
                            }),
                            strategy: JobFailureStrategy.Requeue,
                        })
                    }
                    // rollback to sign with failure
                    await this.jobStepTransitionService.rollbackToSignWithFailure(
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
        } catch (error) {
            console.error("Error executing reconcile balance transaction",
                error)
            throw error
        }
    }
}
