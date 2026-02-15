import {
    Injectable 
} from "@nestjs/common"
import {
    OpenPositionActionService, 
    SignedTx 
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
import {
    DayjsService 
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
    JobStepTransitionService 
} from "../../../update"
    
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
    private readonly sendHeartbeatService: SendHeartbeatService,
    private readonly dayjsService: DayjsService,
    private readonly jobStepTransitionService: JobStepTransitionService,
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
        await this.sendHeartbeatService.process({
            bot,
            job,
            bullmqJob,
        })
        // get the previous attempts
        const hasPreviousAttempts = bullmqJob.attemptsMade > 0

        // get the active step index
        const stepIndex = job.tasks[taskIndex].activeStep ?? 0

        // get the step (may be undefined if steps not initialized)
        const step = job.tasks[taskIndex].steps?.[stepIndex]

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

            // execute the signed tx
            const executeResult = await this.openPositionActionService.execute({
                bot,
                state,
                txCheck: (hasPreviousAttempts || isRetry) ?? false,
                liquidityPool,
                signedTx: this.superJson.parse<SignedTx>(signedTx),
                stimulate: envConfig().executor.runtime.operation.openPosition.stimulate,
            })

            // update the job with the execute result + move to next step
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
                            "task.type": TaskType.OpenPosition,
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
                // get the tx failure index
                const retries = step?.retries ?? 0
                if (retries >= envConfig().executor.workers.job.txSendMaxAttempts) {
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
                                    "task.type": TaskType.OpenPosition,
                                },
                            ],
                        }
                    )
                    throw new JobFailureException(
                        {
                            originalError: new ActionJobTaskTxSendMaxAttemptsException(
                                {
                                    maxAttempts: envConfig().executor.workers.job.txSendMaxAttempts,
                                    originalError: error,
                                    botId: bot.id,
                                    jobId: job.id,
                                    liquidityPoolId: liquidityPool.displayId,
                                    metadata: job.metadata,
                                    type: TaskType.OpenPosition,
                                }
                            ),
                            strategy: JobFailureStrategy.Requeue,
                        }
                    )
                }
                // rollback to sign with failure
                await this.jobStepTransitionService.rollbackToSignWithFailure(
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

            throw error
        }
    }
}