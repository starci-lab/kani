import {
    Injectable
} from "@nestjs/common"
import {
    ClosePositionActionService,
    PrepareTx,
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
    ClosePositionTaskSignParams
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
import {
    TransactionSignedFailedException 
} from "@modules/exceptions"
/**
 * Service for the Close Position Task SIGN step.
 */
@Injectable()
export class ClosePositionTaskSignService {
    constructor(
        private readonly closePositionActionService: ClosePositionActionService,
        private readonly sendHeartbeatService: SendHeartbeatService,
        private readonly winstonService: WinstonService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly debugContextService: DebugContextService,
        private readonly debugLatencyService: DebugLatencyService,
        private readonly jobStepService: JobStepService,
        private readonly retryService: RetryService,
    ) { }
    /**
     * Process the Close Position Task SIGN step.
     *
     * @param params - The parameters for the step.
     * @param taskIndex - The index of the task.
     * @param bullmqJob - The BullMQ job.
     * @param job - The job.
     * @param bot - The bot.
     * @param liquidityPool - The liquidity pool.
     * @returns The result of the step.
     */
    async process({
        taskIndex,
        bullmqJob,
        job,
        bot,
        liquidityPool,
        jobType,
    }: ClosePositionTaskSignParams) {
        const contextPayload = this.debugContextService.createContextPayload({
            jobType,
            jobId: job.id,
            botId: bot.id,
        })
        const stepIndex = job.tasks[taskIndex].activeStep
        const prepareTx = this.superJson.parse<PrepareTx>(
            job.tasks[taskIndex].steps[stepIndex].prepareTx,
        )
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
            const { signedTx } = await this.retryService.retry({
                action: async () => {
                    return await this.closePositionActionService.sign(
                        {
                            bot,
                            prepareTx,
                            liquidityPool,
                        },  
                    )
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
                                taskType: TaskType.ClosePosition,
                                stepIndex,
                                metadata: job.metadata,
                                attemptsMade: context.attemptNumber,
                                error: context.error?.message ?? "unknown",
                            }
                        )
                    },
                },
            })
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Sign transaction successfully",
            })
            await this.jobStepService.setStepSignedAndAdvanceToExecute({
                jobId: job.id,
                taskType: TaskType.ClosePosition,
                taskIndex,
                stepIndex,
                signedTx: this.superJson.stringify(signedTx),
            })
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Persist signed transaction successfully",
            })
            this.winstonService.log(
                WinstonLog.ActionJobTaskStepSigned,
                {
                    botId: bot.id,
                    jobId: job.id,
                    jobType,
                    taskIndex,
                    taskType: TaskType.ClosePosition,
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
                    taskType: TaskType.ClosePosition,
                    stepIndex,
                    error: error.message,
                    metadata: job.metadata,
                }
            )
            if (error instanceof TransactionSignedFailedException) {
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