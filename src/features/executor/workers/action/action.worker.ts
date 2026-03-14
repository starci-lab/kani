import {
    Processor as Worker,
    WorkerHost,
} from "@nestjs/bullmq"
import {
    BullQueueName,
    bullData,
} from "@modules/bullmq"
import {
    envConfig,
} from "@modules/env"
import {
    TaskType,
} from "@modules/databases"
import {
    InjectSuperJson,
} from "@modules/mixin"
import SuperJSON from "superjson"
import {
    Job 
} from "bullmq"
import {
    ActionPayload 
} from "@modules/blockchains"
import {
    OnFailedService,
} from "./on-failed.service"
import {
    OnCompletedService,
} from "./on-completed.service"
import {
    JobContextService, 
    LiquidityPoolContextService
} from "./context"
import {
    AsyncService 
} from "@modules/mixin"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import {
    CancelService 
} from "./cancel.service"
import {
    ClosePositionTaskDispatchService,
    OpenPositionTaskDispatchService,
    ReconcileBalanceTaskDispatchService,
    TransferFeesTaskDispatchService,
    WithdrawTaskDispatchService,
} from "./tasks"

/**
 * The action worker is responsible for processing the action job.
 */
@Worker(
    bullData[BullQueueName.Action].name,
    {
        concurrency: envConfig().bullmq.concurrency,
        lockDuration: envConfig().bullmq.lockDuration,
        stalledInterval: envConfig().bullmq.stalledInterval,
        maxStalledCount: envConfig().bullmq.maxStalledCount,
    }
)
export class ActionWorker extends WorkerHost {
    constructor(
        private readonly onFailedService: OnFailedService,
        private readonly asyncService: AsyncService,
        private readonly onCompletedService: OnCompletedService,
        private readonly jobContextService: JobContextService,
        private readonly liquidityPoolContextService: LiquidityPoolContextService,  
        private readonly winstonService: WinstonService,
        private readonly cancelService: CancelService,
        private readonly closePositionTaskDispatchService: ClosePositionTaskDispatchService,
        private readonly openPositionTaskDispatchService: OpenPositionTaskDispatchService,
        private readonly reconcileBalanceTaskDispatchService: ReconcileBalanceTaskDispatchService,
        private readonly transferFeesTaskDispatchService: TransferFeesTaskDispatchService,
        private readonly withdrawTaskDispatchService: WithdrawTaskDispatchService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
    ) {
        super()
    }

    /**
     * Process the action job.
     * @param bullmqJob - The BullMQ job.
     * @returns A promise that resolves when the job is processed.
     */
    async process(
        bullmqJob: Job<string>
    ): Promise<void> {
        const payload = this.superJson.parse<ActionPayload>(bullmqJob.data)
        const { jobId, botId, tasks, isRetry } = payload
        // Load the job and bot context
        const [
            context,
            error
        ] = await this.asyncService.resolveTuple(
            this.jobContextService.load({
                jobId, botId 
            }
            )
        )
        if (error) {
            this.winstonService.log(
                WinstonLog.ActionJobContextLoadFailed,
                {
                    jobId,
                    botId,
                    type: payload.type,
                    error: error.message,
                }
            )
            await this.cancelService.process(
                {
                    jobId,
                    botId,
                }
            )
            return
        }
        // end load the job and bot context
        try {
            for (let taskIndex = context.job.taskIndex; taskIndex < tasks.length; taskIndex++) {
                const task = tasks[taskIndex]
                switch (task.type) {
                case TaskType.ClosePosition: {
                    const { 
                        liquidityPool, 
                        state 
                    } = await this.liquidityPoolContextService.load({
                        liquidityPoolId: task.payload.liquidityPoolId,
                    })
                    await this.closePositionTaskDispatchService.dispatch(
                        {
                            jobId,
                            botId,
                            liquidityPool,
                            payload: task.payload,
                            state,
                            bullmqJob,
                            taskIndex,
                            jobType: payload.type,
                        }
                    )
                    break
                }
                case TaskType.OpenPosition: {
                    const { 
                        liquidityPool, 
                        state 
                    } = await this.liquidityPoolContextService.load({
                        liquidityPoolId: task.payload.liquidityPoolId,
                    })
                    await this.openPositionTaskDispatchService.dispatch(
                        {
                            jobId,
                            botId,
                            liquidityPool,
                            payload: task.payload,
                            state,
                            bullmqJob,
                            taskIndex,
                            isRetry,
                            jobType: payload.type,
                        }
                    )
                    break
                }
                case TaskType.ReconcileBalance: {
                    await this.reconcileBalanceTaskDispatchService.dispatch(
                        {
                            jobId,
                            botId,
                            payload: task.payload,
                            isRetry,
                            bullmqJob,
                            taskIndex,
                            jobType: payload.type,
                        }
                    )
                    break
                }
                case TaskType.TransferFees: {
                    await this.transferFeesTaskDispatchService.dispatch({
                        jobId,
                        botId,
                        payload: task.payload,
                        bullmqJob,
                        taskIndex,
                        isRetry,
                        jobType: payload.type,
                    })
                    break
                }
                case TaskType.Withdraw: {
                    await this.withdrawTaskDispatchService.dispatch(
                        {
                            jobId,
                            botId,
                            payload: task.payload,
                            bullmqJob,
                            taskIndex,
                            isRetry,
                            jobType: payload.type,
                        }
                    )
                    break
                }
                }
            }
            await this.onCompletedService.process(
                {
                    job: context.job,
                    bot: context.bot,
                    bullmqJob,
                    payload,
                }
            )
        } catch (error) {
            await this.onFailedService.process(
                {
                    job: context.job,
                    bot: context.bot,
                    bullmqJob,
                    error,
                }
            )
        }
    }
}