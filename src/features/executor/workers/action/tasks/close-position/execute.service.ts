import {
    Injectable 
} from "@nestjs/common"
import {
    ClosePositionActionService, SignedTx 
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
    JobTaskService,
} from "../../update"
import {
    strict as assert 
} from "node:assert"
import {
    DebugFileLoggerService
} from "@modules/debug"
/**
 * Service for the Close Position Task EXECUTE step.
 */
@Injectable()
export class ClosePositionTaskExecuteService {
    constructor(
    private readonly closePositionActionService: ClosePositionActionService,
    @InjectPrimaryMongoose()
    private readonly connection: Connection,
    @InjectSuperJson()
    private readonly superJson: SuperJSON,
    private readonly sendHeartbeatService: SendHeartbeatService,
    private readonly winstonService: WinstonService,
    private readonly jobStepService: JobStepService,
    private readonly jobTaskService: JobTaskService,
    private readonly debugFileLoggerService: DebugFileLoggerService,
    ) {}

    /**
   * Process the CLOSE POSITION TASK EXECUTE step.
   */
    async process({
        bot,
        job,
        liquidityPool,
        state,
        isRetry,
        bullmqJob,
        taskIndex,
    }: ClosePositionTaskExecuteParams) {
        // previous attempts from BullMQ
        const hasPreviousAttempts = bullmqJob.attemptsMade > 0
        // active step index
        const stepIndex = job.tasks[taskIndex].activeStep ?? 0
        // step snapshot (may be undefined)
        const step = job.tasks[taskIndex].steps?.[stepIndex]
        try {
            // heartbeat
            await this.sendHeartbeatService.process({
                bot,
                job,
                bullmqJob,
            })

            if (Math.random() < 2) {
                throw new RpcClientFatalException({
                    message: "test",
                    originalError: new Error("test"),
                })
            }

            // signed tx
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
            // execute
            const executeResult = await this.closePositionActionService.execute({
                bot,
                state,
                txCheck: (hasPreviousAttempts || isRetry) ?? false,
                liquidityPool,
                signedTx: this.superJson.parse<SignedTx>(signedTx),
                stimulate: envConfig().executor.runtime.operation.closePosition.stimulate,
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
                            "task.type": TaskType.ClosePosition,
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
                    type: JobType.ClosePosition,
                    taskIndex,
                    taskType: TaskType.ClosePosition,
                    stepIndex,
                }
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.ActionJobTaskStepExecutedFailed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: JobType.ClosePosition,
                    taskIndex,
                    taskType: TaskType.ClosePosition,
                    stepIndex,
                    error: error.message,
                }
            )
            if (error instanceof RpcClientFatalException) {
                // retry cap (use in-memory snapshot)
                const retries = step?.retries ?? 0
                const maxAttempts = envConfig().executor.workers.job.txExecuteMaxAttempts
                // if tx failure index is greater than or equal to max attempts, throw a job failure exception
                if (retries >= maxAttempts) {
                    await this.debugFileLoggerService.debug({
                        message: "rollback to prepared",
                        retries,
                    })
                    await this.jobTaskService.rollbackToPrepared(
                        {
                            jobId: job.id,
                            taskIndex,
                        }
                    )   
                    return
                }
                // rollback to sign with failure
                await this.debugFileLoggerService.debug({
                    message: "rollback to sign with failure",
                    retries,
                })
                await this.jobStepService.rollbackToSignWithFailure(
                    {
                        jobId: job.id,
                        taskType: TaskType.ClosePosition,
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
            throw error
        }
    }
}