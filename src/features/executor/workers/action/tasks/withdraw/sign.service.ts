import {
    Injectable 
} from "@nestjs/common"
import {
    BalanceActionService, PrepareTx 
} from "@modules/blockchains"
import {
    TaskType,
} from "@modules/databases"
import {
    InjectSuperJson 
} from "@modules/mixin"
import SuperJSON from "superjson"
import {
    SendHeartbeatService 
} from "../../send-heartbeat.service"
import {
    WithdrawTaskSignParams 
} from "../types"
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
import {
    JobStepService,
} from "../../update"
import {
    RetryService
} from "@modules/mixin"
import {
    envConfig 
} from "@modules/env"

/**
 * Service for the WITHDRAW TASK SIGN step.
 */
@Injectable()
export class WithdrawTaskSignService {
    constructor(
        private readonly balanceActionService: BalanceActionService,
        private readonly sendHeartbeatService: SendHeartbeatService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly winstonService: WinstonService,
        private readonly debugContextService: DebugContextService,
        private readonly debugLatencyService: DebugLatencyService,
        private readonly jobStepService: JobStepService,
        private readonly retryService: RetryService,
    ) {}

    /**
   * Process the WITHDRAW TASK SIGN step.
   */
    async process({
        bot,
        job,
        bullmqJob,
        taskIndex,
        jobType,
    }: WithdrawTaskSignParams) {
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
            const prepareTx = this.superJson.parse<PrepareTx>(step.prepareTx)
            const { signedTx } = await this.retryService.retry({
                action: async () => {
                    return await this.balanceActionService.signReconcileBalanceTransaction({
                        bot,
                        prepareTx,
                    })
                },
                options: {
                    retries: envConfig().executor.workers.job.sign.maxAttempts,
                    minTimeout: envConfig().executor.workers.job.sign.minTimeout,
                    maxTimeout: envConfig().executor.workers.job.sign.maxTimeout,
                    onFailedAttempt: async (context) => {
                    // log the failed attempt
                        this.winstonService.log(
                            WinstonLog.ActionJobTaskStepSignedFailedAttempt,
                            {
                                botId: bot.id,
                                jobId: job.id,
                                jobType,
                                taskIndex,
                                taskType: TaskType.Withdraw,
                                stepIndex,
                                metadata: job.metadata,
                                attemptsMade: context.attemptNumber,
                            }
                        )
                    },
                }
            })
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Sign transaction successfully",
            })
            await this.jobStepService.setStepSignedAndAdvanceToExecute({
                jobId: job.id,
                taskType: TaskType.Withdraw,
                taskIndex,
                stepIndex,
                signedTx: this.superJson.stringify(signedTx),
            })
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Persist signed transaction successfully",
            })
            this.winstonService.log(WinstonLog.ActionJobTaskStepSigned,
                {
                    botId: bot.id,
                    jobId: job.id,
                    jobType,
                    taskIndex,
                    taskType: TaskType.Withdraw,
                    stepIndex,
                    metadata: job.metadata,
                })
        } catch (error) {
            this.winstonService.log(
                WinstonLog.ActionJobTaskStepSignedFailed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    jobType,
                    taskIndex,
                    taskType: TaskType.Withdraw,
                    stepIndex,
                    error: error.message,
                    metadata: job.metadata,
                }
            )
        }
    }
}