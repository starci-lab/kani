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
    WithdrawTaskExecuteParams 
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
    JobFailureStrategy 
} from "@modules/common"
import {
    envConfig 
} from "@modules/env"
import {
    JobStepService 
} from "../../update"
import {
    WinstonService, WinstonLog 
} from "@modules/winston"
import {
    strict as assert 
} from "node:assert"

/**
 * Service for the WITHDRAW TASK EXECUTE step.
 */
@Injectable()
export class WithdrawTaskExecuteService {
    constructor(
    private readonly balanceActionService: BalanceActionService,
    @InjectPrimaryMongoose()
    private readonly connection: Connection,
    @InjectSuperJson()
    private readonly superJson: SuperJSON,
    private readonly sendHeartbeatService: SendHeartbeatService,
    private readonly jobStepService: JobStepService,
    private readonly winstonService: WinstonService,
    ) {}

    /**
   * Process the WITHDRAW TASK EXECUTE step.
   */
    async process({ bot, job, bullmqJob, taskIndex }: WithdrawTaskExecuteParams) {
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
            // heartbeat
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
            const executeResult = await this.balanceActionService.executeWithdrawTransaction(
                {
                    bot,
                    txCheck: true,
                    stimulate: envConfig().executor.runtime.operation.withdraw.stimulate,
                    signedTx: this.superJson.parse<SignedTx>(signedTx),
                },
            )

            // persist execute result + move next step
            const updateJobResult = await this.connection
                .model<JobSchema>(JobSchema.name)
                .updateOne(
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
                                "task.type": TaskType.Withdraw,
                            },
                            {
                                "step.index": stepIndex,
                            },
                        ],
                    },
                )

            assert(updateJobResult.matchedCount > 0)

            this.winstonService.log(WinstonLog.ActionJobTaskStepExecuted,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: JobType.Withdraw,
                    taskIndex,
                    taskType: TaskType.Withdraw,
                    stepIndex,
                    metadata: job.metadata,
                })
        } catch (error) {
            this.winstonService.log(WinstonLog.ActionJobTaskStepExecutedFailed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: JobType.Withdraw,
                    taskIndex,
                    taskType: TaskType.Withdraw,
                    stepIndex,
                    error: error.message,
                    metadata: job.metadata,
                })

            // Fatal RPC error -> retry ladder (same as ReconcileBalance)
            if (error instanceof RpcClientFatalException) {
                // 1) bump executeRetries until max-1
                if (executeRetries < executeMaxRetries - 1) {
                    await this.jobStepService.updateExecuteRetries({
                        jobId: job.id,
                        taskType: TaskType.Withdraw,
                        taskIndex,
                        stepIndex,
                    })
                    return
                }

                // 2) rollback to Sign if we still can retry signing
                if (signRetries < signMaxRetries - 1) {
                    await this.jobStepService.rollbackToSign({
                        jobId: job.id,
                        taskType: TaskType.Withdraw,
                        taskIndex,
                        stepIndex,
                        error,
                    })
                    return
                }

                // 3) otherwise rollback whole task to Prepared
                await this.jobStepService.rollbackToPrepared({
                    jobId: job.id,
                    taskIndex,
                })
                return
            }

            // non-RPC fatal -> bubble up
            throw error
        }
    }
}