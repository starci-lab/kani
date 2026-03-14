import {
    Injectable 
} from "@nestjs/common"
import {
    OpenPositionTaskConfirmService 
} from "./confirm.service"
import {
    OpenPositionTaskDispatcherParams 
} from "../types"
import {
    JobSchema,
    JobType,
    StepType,
} from "@modules/databases"
import {
    JobContextNotFoundException,
} from "@modules/exceptions"
import {
    OpenPositionTaskPrepareService,
} from "./prepare.service"
import {
    OpenPositionTaskSignService,
} from "./sign.service"
import {
    OpenPositionTaskExecuteService,
} from "./execute.service"
import {
    JobContextService,
    LoadJobContextResult,
} from "../../context"
import {
    AsyncService,
} from "@modules/mixin"
import {
    DebugContextService,
} from "../debug-context.service"
import {
    DebugLatencyService,
} from "@modules/debug"

/**
 * Dispatcher service for the OPEN POSITION task.
 */
@Injectable()
export class OpenPositionTaskDispatchService {
    constructor(
        private readonly openPositionTaskPrepareService: OpenPositionTaskPrepareService,
        private readonly openPositionTaskSignService: OpenPositionTaskSignService,
        private readonly openPositionTaskExecuteService: OpenPositionTaskExecuteService,
        private readonly openPositionTaskConfirmService: OpenPositionTaskConfirmService,
        private readonly asyncService: AsyncService,
        private readonly jobContextService: JobContextService,
        private readonly debugContextService: DebugContextService,
        private readonly debugLatencyService: DebugLatencyService,
    ) { }

    /**
     * Dispatch the OPEN POSITION task.
     * @param params - The parameters for the OPEN POSITION task.
     * @param params.bot - The bot.
     * @param params.job - The job.
     * @param params.liquidityPool - The liquidity pool.
     * @param params.state - The state of the liquidity pool.
     * @param params.isRetry - Whether the task is being retried.
     * @param params.taskIndex - The index of the task.
     */
    async dispatch(
        {
            botId,
            jobId,
            liquidityPool,
            state,
            payload,
            bullmqJob,
            taskIndex,
            isRetry
        }: OpenPositionTaskDispatcherParams
    ) {
        // create the context payload for debug latency
        const contextPayload = this.debugContextService.createContextPayload({
            jobType: JobType.OpenPosition,
            jobId: jobId,
            botId: botId,
        })
        this.debugLatencyService.createContext(contextPayload)
        // create the context for debug latency
        let context: LoadJobContextResult | null = null
        do {
            const [
                _context,
                error,
            ] = await this.asyncService.resolveTuple(
                this.jobContextService.load(
                    {
                        jobId,
                        botId,
                    },
                ),
            )
            context = _context
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Job context loaded successfully",
            })
            if (error) {
                throw error
            }
            if (!context) {
                throw new JobContextNotFoundException({
                    jobId,
                    botId,
                })
            }
            if (!context.job.tasks[taskIndex] || context.job.tasks[taskIndex].initialized === false) {
                await this.openPositionTaskPrepareService.process(
                    {
                        bot: context.bot,
                        job: context.job,
                        payload,
                        bullmqJob,
                        liquidityPool,
                        state,
                        taskIndex,
                        isRetry,
                    }
                )
                continue
            }
            // we take the next step
            const activeStep = context.job.tasks[taskIndex].activeStep
            const stepCount = context.job.tasks[taskIndex].stepCount
            if (activeStep <= stepCount - 1) {
                // get the current step type
                const stepType = context.job.tasks[taskIndex].steps[activeStep].type
                switch (stepType) {
                case StepType.Sign: {
                    await this.openPositionTaskSignService.process(
                        {
                            bot: context.bot,
                            job: context.job,
                            liquidityPool,
                            payload,
                            state,
                            bullmqJob,
                            taskIndex,
                            isRetry,
                        }
                    )
                    continue
                }
                // Execute step
                case StepType.Execute: {
                    await this.openPositionTaskExecuteService.process(
                        {
                            bot: context.bot,
                            job: context.job,
                            liquidityPool,
                            payload,
                            state,
                            bullmqJob,
                            taskIndex,
                            isRetry,
                        }
                    )
                    continue
                }
                }
            }
            if (!context.job.tasks[taskIndex].confirmed) {
                await this.openPositionTaskConfirmService.process(
                    {
                        bot: context.bot,
                        job: context.job,
                        liquidityPool,
                        payload,
                        state,
                        bullmqJob,
                        taskIndex,
                        isRetry,
                    }
                )
            }
        } while (
            !this.isTaskCompleted(
                context.job,
                taskIndex,
            )
        )
    }

    /**
     * Checks if the task is complete.
     * @param jobSnapshot - The job snapshot.
     * @param taskIndex - The index of the task.
     * @returns True if the task is complete, false otherwise.
     */
    private isTaskCompleted(job: JobSchema | null, taskIndex: number) {
        const task = job?.tasks[taskIndex]
        if (!task) {
            return false
        }
        return (task.activeStep) >= (task.stepCount)
    }
}