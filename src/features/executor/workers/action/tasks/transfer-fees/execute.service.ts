import {
    Injectable
} from "@nestjs/common"
import {
    BalanceActionService,
    SignedTx,
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
    TransferFeesTaskExecuteParams
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
    WinstonService,
    WinstonLog
} from "@modules/winston"
import {
    strict as assert
} from "node:assert"

/**
 * Service for the Transfer Fees Task EXECUTE step.
 */
@Injectable()
export class TransferFeesTaskExecuteService {
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
     * Process the Transfer Fees Task EXECUTE step.
     */
    async process(
        { bot, job, bullmqJob, taskIndex }: TransferFeesTaskExecuteParams
    ) {
        const stepIndex = job.tasks[taskIndex].activeStep ?? 0
        const step = job.tasks[taskIndex].steps?.[stepIndex]
        const executeRetries = step?.executeRetries ?? 0
        const executeMaxRetries = envConfig().executor.workers.job.txExecuteMaxRetries
        const signRetries = step?.signRetries ?? 0
        const signMaxRetries = envConfig().executor.workers.job.txSignMaxRetries

        try {
            await this.sendHeartbeatService.process({
                bot,
                job,
                bullmqJob,
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

            const executeResult = await this.balanceActionService.executeWithdrawTransaction({
                bot,
                txCheck: true,
                stimulate: envConfig().executor.runtime.operation.transferFees.stimulate,
                signedTx: this.superJson.parse<SignedTx>(signedTx),
            })

            const updateJobResult = await this.connection
                .model<JobSchema>(JobSchema.name)
                .updateOne(
                    {
                        _id: job.id 
                    },
                    {
                        $set: {
                            "tasks.$[task].steps.$[step].executeResult": this.superJson.stringify(executeResult),
                            "tasks.$[task].steps.$[step].type": StepType.Execute,
                        },
                        $inc: {
                            "tasks.$[task].activeStep": 1,
                        },
                    },
                    {
                        arrayFilters: [
                            {
                                "task.index": taskIndex, "task.type": TaskType.TransferFees 
                            },
                            {
                                "step.index": stepIndex 
                            },
                        ],
                    },
                )

            assert(updateJobResult.matchedCount > 0)

            this.winstonService.log(WinstonLog.ActionJobTaskStepExecuted,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: job.type ?? JobType.OpenPosition,
                    taskIndex,
                    taskType: TaskType.TransferFees,
                    stepIndex,
                    metadata: job.metadata,
                })
        } catch (error) {
            this.winstonService.log(WinstonLog.ActionJobTaskStepExecutedFailed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: job.type ?? JobType.OpenPosition,
                    taskIndex,
                    taskType: TaskType.TransferFees,
                    stepIndex,
                    error: error.message,
                    metadata: job.metadata,
                })

            if (error instanceof RpcClientFatalException) {
                if (executeRetries < executeMaxRetries - 1) {
                    await this.jobStepService.updateExecuteRetries({
                        jobId: job.id,
                        taskType: TaskType.TransferFees,
                        taskIndex,
                        stepIndex,
                    })
                    return
                }
                if (signRetries < signMaxRetries - 1) {
                    await this.jobStepService.rollbackToSign({
                        jobId: job.id,
                        taskType: TaskType.TransferFees,
                        taskIndex,
                        stepIndex,
                        error,
                    })
                    return
                }
                await this.jobStepService.rollbackToPrepared({
                    jobId: job.id,
                    taskIndex,
                })
                return
            }

            throw error
        }
    }
}
