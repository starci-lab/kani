import {
    Injectable 
} from "@nestjs/common"
import {
    OpenPositionActionService, 
    PrepareOpenPositionResult, 
    SignedTx 
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
    OpenPositionTaskExecuteParams 
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
 * Service for the Close Position Task EXECUTE step.
 */
@Injectable()
export class OpenPositionTaskExecuteService {
    constructor(
    private readonly openPositionActionService: OpenPositionActionService,
    @InjectPrimaryMongoose()
    private readonly connection: Connection,
    @InjectSuperJson()
    private readonly superJson: SuperJSON,
    private readonly jobTaskService: JobTaskService,
    private readonly sendHeartbeatService: SendHeartbeatService,
    private readonly jobStepService: JobStepService,
    private readonly winstonService: WinstonService,
    ) {}

    /**
   * Process the CLOSE POSITION TASK EXECUTE step.
   */
    async process(
        {
            bot,
            job,
            liquidityPool,
            state,
            isRetry,
            bullmqJob,
            taskIndex,
        }: OpenPositionTaskExecuteParams
    ) {
        // previous attempts from BullMQ
        const hasPreviousAttempts = bullmqJob.attemptsMade > 0
        // active step index
        const stepIndex = job.tasks[taskIndex].activeStep ?? 0
        // step snapshot (may be undefined)
        const step = job.tasks[taskIndex].steps?.[stepIndex]
        // already retries
        const alreadyRetries = ((job.tasks?.[taskIndex]?.retries ?? 0) > 0) 
        && (job.tasks?.[taskIndex]?.steps?.[stepIndex]?.executeRetries ?? 0) > 0
        try {
            // send heartbeat
            await this.sendHeartbeatService.process({
                bot,
                job,
                bullmqJob,
            })

            // get the signed tx
            const signedTx = step?.signedTx

            // if the signed tx is not found, throw a fatal error
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
            const prepareResult = this.superJson.parse<PrepareOpenPositionResult>(job.tasks[taskIndex].prepareResult ?? "")
            // execute the signed tx
            const executeResult = await this.openPositionActionService.execute({
                positionId: prepareResult?.positionId ?? "",
                bot,
                state,
                txCheck: (hasPreviousAttempts || isRetry || alreadyRetries) ?? false,
                liquidityPool,
                signedTx: this.superJson.parse<SignedTx>(signedTx),
                stimulate: envConfig().executor.runtime.operation.openPosition.stimulate,
            })
            // update the job with the execute result + move to next step
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
                            "task.type": TaskType.OpenPosition,
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
                    type: JobType.OpenPosition,
                    taskIndex,
                    taskType: TaskType.OpenPosition,
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
                    type: JobType.OpenPosition,
                    taskIndex,
                    taskType: TaskType.OpenPosition,
                    stepIndex,
                    error: error.message,
                    metadata: job.metadata,
                }
            )
            // If tx execution failed with a fatal RPC error, rollback to Sign and record failure atomically.
            if (error instanceof RpcClientFatalException) {
                // execute retries
                const executeRetries = step?.executeRetries ?? 0
                // execute max retries
                const executeMaxRetries = envConfig().executor.workers.job.txExecuteMaxRetries
                // sign retries
                const signRetries = step?.signRetries ?? 0
                // sign max retries
                const signMaxRetries = envConfig().executor.workers.job.txSignMaxRetries
                // if execute retries is less than execute max retries, increment the execute retries
                if (executeRetries < executeMaxRetries) {
                    await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                        {
                            _id: job.id,
                        },
                        {
                            $inc: {
                                "tasks.$[task].steps.$[step].executeRetries": 1,
                            },
                            arrayFilters: [
                                {
                                    "task.index": taskIndex,
                                    "task.type": TaskType.OpenPosition,
                                },
                                {
                                    "step.index": stepIndex,
                                },
                            ],
                        },
                    )
                    // sleep for the retry interval
                    await sleep(
                        envConfig().executor.workers.job.retryInterval
                    )
                    return
                }
                // if tx failure index is greater than or equal to max attempts, throw a job failure exception
                if (signRetries < signMaxRetries) {
                    await this.jobStepService.rollbackToSign(
                        {
                            jobId: job.id,
                            taskType: TaskType.OpenPosition,
                            taskIndex,
                            stepIndex,
                            error,
                        }
                    )
                    // sleep for the retry interval
                    await sleep(
                        envConfig().executor.workers.job.retryInterval
                    )
                    return
                }
                await this.jobStepService.rollbackToPrepared(
                    {
                        jobId: job.id,
                        taskIndex,
                    }
                )       
                // sleep for the retry interval
                await sleep(
                    envConfig().executor.workers.job.retryInterval
                )
                return
            }

            throw error
        }
    }
}