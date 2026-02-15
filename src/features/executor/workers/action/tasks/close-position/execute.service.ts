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
    ActionJobTaskTxSendMaxAttemptsException,
} from "@modules/exceptions"
import {
    envConfig 
} from "@modules/env"
import {
    JobFailureStrategy,
    sleep,
} from "@modules/common"
import {
    DayjsService 
} from "@modules/mixin"
import {
    JobStepTransitionService 
} from "../../update"
    
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
    private readonly dayjsService: DayjsService,
    private readonly jobStepTransitionService: JobStepTransitionService,
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
        } catch (error) {
            if (error instanceof RpcClientFatalException) {
                // retry cap (use in-memory snapshot)
                const retries = step?.retries ?? 0
                const maxAttempts = envConfig().executor.workers.job.txSendMaxAttempts
                // if tx failure index is greater than or equal to max attempts, throw a job failure exception
                if (retries >= maxAttempts) {
                    // reset retries to 0
                    await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                        {
                            _id: job.id 
                        },
                        {
                            $set: {
                                "tasks.$[task].steps.$[step].retries": 0 
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
                        }
                    )
                    throw new JobFailureException(
                        {
                            originalError: new ActionJobTaskTxSendMaxAttemptsException({
                                maxAttempts,
                                originalError: error,
                                botId: bot.id,
                                jobId: job.id,
                                liquidityPoolId: liquidityPool.displayId,
                                metadata: job.metadata,
                                type: TaskType.ClosePosition,
                            }),
                            strategy: JobFailureStrategy.Requeue,
                        }
                    )
                }
                // rollback to sign with failure
                await this.jobStepTransitionService.rollbackToSignWithFailure(
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