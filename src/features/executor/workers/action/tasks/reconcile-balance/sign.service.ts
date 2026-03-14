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
    JobFailureException 
} from "@modules/exceptions"
import {
    JobFailureStrategy 
} from "@modules/common"
import {
    JobStepService 
} from "../../update"

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
            const { signedTx } = await this.balanceActionService.signReconcileBalanceTransaction(
                {
                    bot,
                    prepareTx,
                },
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
                    type: jobType,
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
                    type: jobType,
                    taskIndex,
                    taskType: TaskType.ReconcileBalance,
                    stepIndex,
                    error: error.message,
                    metadata: job.metadata,
                }
            )
            // if sign failed, check the number of sign retries
            const signProcessingRetries = step?.signProcessingRetries ?? 0
            if (signProcessingRetries >= envConfig().executor.workers.job.txSignProcessingMaxRetries) {
                throw new JobFailureException({
                    originalError: error,
                    strategy: JobFailureStrategy.Fatal,
                })
            } else {
                // rollback to prepared
                await this.jobStepService.rollbackToPrepared({
                    jobId: job.id,
                    taskIndex,
                    incrementSignProcessingRetries: true,
                })
            } 
        }
    }
}