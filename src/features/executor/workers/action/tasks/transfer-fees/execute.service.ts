import {
    Injectable
} from "@nestjs/common"
import {
    BalanceActionService,
    SignedTx,
} from "@modules/blockchains"
import {
    TaskType,
} from "@modules/databases"
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
    DebugContextService,
} from "../debug-context.service"
import {
    DebugLatencyService,
} from "@modules/debug"
import {
    RetryService
} from "@modules/mixin"

/**
 * Service for the Transfer Fees Task EXECUTE step.
 */
@Injectable()
export class TransferFeesTaskExecuteService {
    constructor(
        private readonly balanceActionService: BalanceActionService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly sendHeartbeatService: SendHeartbeatService,
        private readonly jobStepService: JobStepService,
        private readonly winstonService: WinstonService,
        private readonly debugContextService: DebugContextService,
        private readonly debugLatencyService: DebugLatencyService,
        private readonly retryService: RetryService,
    ) {}

    /**
     * Process the Transfer Fees Task EXECUTE step.
     */
    async process(
        { 
            bot, 
            job, 
            bullmqJob, 
            taskIndex, 
            jobType 
        }: TransferFeesTaskExecuteParams
    ) {
        const contextPayload = this.debugContextService.createContextPayload({
            jobType,
            jobId: job.id,
            botId: bot.id,
        })
        const stepIndex = job.tasks[taskIndex].activeStep ?? 0
        const step = job.tasks[taskIndex].steps?.[stepIndex]    
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
                        taskIndex,
                        stepIndex,
                    }),
                    strategy: JobFailureStrategy.Fatal,
                })
            }

            const executeResult = await this.retryService.retry({
                action: async () => {
                    return await this.balanceActionService.executeWithdrawTransaction({
                        bot,
                        txCheck: true,
                        stimulate: envConfig().executor.runtime.operation.transferFees.stimulate,
                        signedTx: this.superJson.parse<SignedTx>(signedTx),
                    })
                },
                options: {
                    retries: envConfig().executor.workers.job.execute.maxAttempts,
                    minTimeout: envConfig().executor.workers.job.execute.minTimeout,
                    maxTimeout: envConfig().executor.workers.job.execute.maxTimeout,
                    onFailedAttempt: async (context) => {
                        // log the failed attempt
                        this.winstonService.log(
                            WinstonLog.ActionJobTaskStepExecuteFailedAttempt,
                            {
                                botId: bot.id,
                                jobId: job.id,
                                jobType,
                                taskIndex,
                                taskType: TaskType.TransferFees,
                                stepIndex,
                                metadata: job.metadata,
                                attemptsMade: context.attemptNumber,
                            }
                        )
                    },
                },
            })
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Execute transaction successfully",
            })
            await this.jobStepService.setStepExecuteResultAndAdvance({
                jobId: job.id,
                taskType: TaskType.TransferFees,
                taskIndex,
                stepIndex,
                executeResult: this.superJson.stringify(executeResult),
            })
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Persist execute result successfully",
            })
            this.winstonService.log(WinstonLog.ActionJobTaskStepExecuted,
                {
                    botId: bot.id,
                    jobId: job.id,
                    jobType,
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
                    jobType,
                    taskIndex,
                    taskType: TaskType.TransferFees,
                    stepIndex,
                    error: error.message,
                    metadata: job.metadata,
                })

            if (error instanceof RpcClientFatalException) {
                await this.jobStepService.rollbackToPrepared({
                    jobId: job.id,
                    taskIndex,
                })
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
