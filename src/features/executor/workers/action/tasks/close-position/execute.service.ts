import {
    Injectable 
} from "@nestjs/common"
import {
    ClosePositionActionService, SignedTx 
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
        private readonly debugContextService: DebugContextService,
        private readonly debugLatencyService: DebugLatencyService,
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
            const executeResult = await this.closePositionActionService.execute(
                {
                    bot,
                    state,
                    txCheck: true,
                    liquidityPool,
                    signedTx: this.superJson.parse<SignedTx>(signedTx),
                    stimulate: envConfig().executor.runtime.operation.closePosition.stimulate,
                },
            )
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Execute transaction successfully",
            })
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
                            "task.type": TaskType.ClosePosition,
                        },
                        {
                            "step.index": stepIndex,
                        },
                    ],
                },
            )
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Persist execute result successfully",
            })
            this.winstonService.log(
                WinstonLog.ActionJobTaskStepExecuted,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: jobType,
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
                    type: jobType,
                    taskIndex,
                    taskType: TaskType.ClosePosition,
                    stepIndex,
                    error: error.message,
                }
            )
            if (error instanceof RpcClientFatalException) {
                // if execute retries is less than execute max retries, increment the execute retries
                if (executeRetries < (executeMaxRetries - 1)) {
                    // update execute retries
                    await this.jobStepService.updateExecuteRetries(
                        {
                            jobId: job.id,
                            taskType: TaskType.ClosePosition,
                            taskIndex,
                            stepIndex,
                        }
                    )
                    this.debugLatencyService.measure({
                        id: contextPayload.id,
                        description: "Execute retries incremented successfully",
                    })
                    return
                }
                // if tx failure index is greater than or equal to max attempts, throw a job failure exception
                if (signRetries < (signMaxRetries - 1)) {
                    await this.jobStepService.rollbackToSign(
                        {
                            jobId: job.id,
                            taskType: TaskType.ClosePosition,
                            taskIndex,
                            stepIndex,
                            error,
                        }
                    )
                    this.debugLatencyService.measure({
                        id: contextPayload.id,
                        description: "Rollback to sign successful",
                    })
                    return
                }
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