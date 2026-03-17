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
    ReconcileBalanceTaskSignParams 
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
    envConfig 
} from "@modules/env"
import {
    JobStepService,
} from "../../update"
import {
    RetryService
} from "@modules/mixin"
import {
    TransactionSignedFailedException 
} from "@modules/exceptions"
/**
 * Service for the Reconcile Balance Task SIGN step.
 */
@Injectable()
export class ReconcileBalanceTaskSignService {
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
   * Process the Reconcile Balance Task SIGN step.
   */
    async process({
        bot,
        job,
        bullmqJob,
        taskIndex,
        jobType,
    }: ReconcileBalanceTaskSignParams) {
        const contextPayload = this.debugContextService.createContextPayload({
            jobType,
            jobId: job.id,
            botId: bot.id,
        })
        const stepIndex = job.tasks[taskIndex].activeStep ?? 0
        const step = job.tasks[taskIndex].steps?.[stepIndex]
        try {
            await this.sendHeartbeatService.process(
                {
                    bot,
                    job,
                    bullmqJob,
                },
            )
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Heartbeat sent successfully",
            })
            const prepareTx = this.superJson.parse<PrepareTx>(step.prepareTx)
            const { 
                signedTx 
            } = await this.retryService.retry(
                {
                    action: async () => {
                        return await this.balanceActionService.signReconcileBalanceTransaction(
                            {
                                bot,
                                prepareTx,
                            },
                        )
                    },
                    options: {
                        retries: envConfig().executor.workers.job.sign.maxAttempts,
                        minTimeout: envConfig().executor.workers.job.sign.minTimeout,
                        maxTimeout: envConfig().executor.workers.job.sign.maxTimeout,
                        onFailedAttempt: async (context) => {
                            this.winstonService.log(
                                WinstonLog.ActionJobTaskStepSignedFailedAttempt,
                                {
                                    botId: bot.id,
                                    jobId: job.id,
                                    jobType,
                                    taskIndex,
                                    taskType: TaskType.ReconcileBalance,
                                    stepIndex,
                                    metadata: job.metadata,
                                    attemptsMade: context.attemptNumber,
                                }
                            )
                        },
                    },
                }
            )
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Reconcile balance transaction signed successfully",
            })
            await this.jobStepService.setStepSignedAndAdvanceToExecute({
                jobId: job.id,
                taskType: TaskType.ReconcileBalance,
                taskIndex,
                stepIndex,
                signedTx: this.superJson.stringify(signedTx),
            })
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Signed transaction persisted successfully",
            })
            this.winstonService.log(
                WinstonLog.ActionJobTaskStepSigned,
                {
                    botId: bot.id,
                    jobId: job.id,
                    jobType,
                    taskIndex,
                    taskType: TaskType.ReconcileBalance,
                    stepIndex,
                    metadata: job.metadata,
                }
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.ActionJobTaskStepSignedFailed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    jobType,
                    taskIndex,
                    taskType: TaskType.ReconcileBalance,
                    stepIndex,
                    error: error.message,
                    metadata: job.metadata,
                }
            )
            if (error instanceof TransactionSignedFailedException) {
                // rollback to prepared
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