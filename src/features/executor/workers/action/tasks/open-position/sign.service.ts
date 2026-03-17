import {
    Injectable 
} from "@nestjs/common"
import {
    OpenPositionActionService, 
    PrepareTx
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
    OpenPositionTaskSignParams 
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
 * Service for the Open Position Task SIGN step.
 */
@Injectable()
export class OpenPositionTaskSignService {
    constructor(
        private readonly openPositionActionService: OpenPositionActionService,
        private readonly sendHeartbeatService: SendHeartbeatService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly winstonService: WinstonService,
        private readonly debugContextService: DebugContextService,
        private readonly debugLatencyService: DebugLatencyService,
        private readonly jobStepService: JobStepService,
        private readonly retryService: RetryService,
    ) { }
    /**
     * Process the Open Position Task SIGN step.
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
    }: OpenPositionTaskSignParams) {
        const contextPayload = this.debugContextService.createContextPayload({
            jobType,
            jobId: job.id,
            botId: bot.id,
        })
        const activeStep = job.tasks[taskIndex].activeStep
        const prepareTx = this.superJson.parse<PrepareTx>(
            job.tasks[taskIndex].steps[activeStep].prepareTx,
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
                    return await this.openPositionActionService.sign(
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
                                taskType: TaskType.OpenPosition,
                                stepIndex: activeStep,
                                metadata: job.metadata,
                                attemptsMade: context.attemptNumber,
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
                taskType: TaskType.OpenPosition,
                taskIndex,
                stepIndex: activeStep,
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
                    taskType: TaskType.OpenPosition,
                    stepIndex: activeStep,
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
                    taskType: TaskType.OpenPosition,
                    stepIndex: activeStep,
                    error: error.message,
                    metadata: job.metadata,
                }
            )
            // rollback to prepared
            await this.jobStepService.rollbackToPrepared(
                {
                    jobId: job.id,
                    taskIndex,
                }
            )
            // measure the latency
            this.debugLatencyService.measure(
                {
                    id: contextPayload.id,
                    description: "Rollback to prepared successful",
                }
            )
        }
    }
}