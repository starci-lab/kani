import {
    Injectable 
} from "@nestjs/common"
import {
    OpenPositionActionService, 
    PrepareOpenPositionResult, 
    SignedTx 
} from "@modules/blockchains"
import {
    TaskType,
} from "@modules/databases"
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
} from "@modules/common"
import {
    JobStepService,
} from "../../update"
import {
    WinstonService,
    WinstonLog,
} from "@modules/winston"
import {
    DebugContextService,
} from "../debug-context.service"
import {
    DebugLatencyService,
} from "@modules/debug"

/**
 * Service for the Open Position Task EXECUTE step.
 */
@Injectable()
export class OpenPositionTaskExecuteService {
    constructor(
        private readonly openPositionActionService: OpenPositionActionService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly sendHeartbeatService: SendHeartbeatService,
        private readonly jobStepService: JobStepService,
        private readonly winstonService: WinstonService,
        private readonly debugContextService: DebugContextService,
        private readonly debugLatencyService: DebugLatencyService,
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
            bullmqJob,
            taskIndex,
            jobType,
        }: OpenPositionTaskExecuteParams
    ) {
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
            const executeResult = await this.openPositionActionService.execute({
                positionId: prepareResult?.positionId ?? "",
                bot,
                state,
                txCheck: true,
                liquidityPool,
                signedTx: this.superJson.parse<SignedTx>(signedTx),
                stimulate: envConfig().executor.runtime.operation.openPosition.stimulate,
            })
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Execute transaction successfully",
            })
            await this.jobStepService.setStepExecuteResultAndAdvance({
                jobId: job.id,
                taskType: TaskType.OpenPosition,
                taskIndex,
                stepIndex,
                executeResult: this.superJson.stringify(executeResult),
            })
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
                    type: jobType,
                    taskIndex,
                    taskType: TaskType.OpenPosition,
                    stepIndex,
                    error: error.message,
                    metadata: job.metadata,
                }
            )
            // If tx execution failed with a fatal RPC error, rollback to Sign and record failure atomically.
            if (error instanceof RpcClientFatalException) {
                // if execute retries is less than execute max retries, increment the execute retries
                if (executeRetries < (executeMaxRetries - 1)) {
                    // update execute retries
                    await this.jobStepService.updateExecuteRetries(
                        {
                            jobId: job.id,
                            taskType: TaskType.OpenPosition,
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
                            taskType: TaskType.OpenPosition,
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