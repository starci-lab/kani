import {
    Injectable 
} from "@nestjs/common"
import {
    ClosePositionTaskExecuteService 
} from "./execute.service"
import {
    ClosePositionTaskSignService 
} from "./sign.service"
import {
    ClosePositionTaskConfirmService 
} from "./confirm.service"
import {
    ClosePositionTaskDispatcherParams 
} from "../types"
import {
    JobSchema,
    StepType
} from "@modules/databases"
import {
    ClosePositionTaskPrepareService 
} from "./prepare.service"
import {
    AsyncService 
} from "@modules/mixin"
import {
    LoadJobContextResult,
    JobContextService 
} from "../../context"
import {
    JobContextNotFoundException 
} from "@modules/exceptions"

/**
 * Dispatcher service for the CLOSE POSITION task.
 */
@Injectable()
export class ClosePositionTaskDispatchService {
    constructor(
        private readonly closePositionTaskPrepareService: ClosePositionTaskPrepareService,
        private readonly closePositionTaskSignService: ClosePositionTaskSignService,
        private readonly closePositionTaskExecuteService: ClosePositionTaskExecuteService,
        private readonly closePositionTaskConfirmService: ClosePositionTaskConfirmService,
        private readonly asyncService: AsyncService,
        private readonly jobContextService: JobContextService,
    ) { }

    /**
     * Dispatch the CLOSE POSITION task.
     * @param params - The parameters for the CLOSE POSITION task.
     * @param params.bot - The bot.
     * @param params.job - The job.
     * @param params.liquidityPool - The liquidity pool.
     * @param params.state - The state of the liquidity pool.
     * @param params.isRetry - Whether the task is being retried.
     * @param params.taskIndex - The index of the task.
     * @param params.stepIndex - The index of the step.
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
        }: ClosePositionTaskDispatcherParams
    ) {
        // context in use
        let context: LoadJobContextResult | null = null
        do {
            const [
                _context,
                error
            ] = await this.asyncService.resolveTuple(
                this.jobContextService.load(
                    {
                        jobId, 
                        botId 
                    }
                )
            )
            context = _context
            if (error) {
                throw error
            }
            if (!context) {
                throw new JobContextNotFoundException({
                    jobId,
                    botId,
                })
            }
            // we retrieve the latest job snapshot
            // if we do not find the task persisted in the job snapshot, we have to prepare 
            if (!context.job.tasks[taskIndex] || context.job.tasks[taskIndex].initialized === false) {
                await this.closePositionTaskPrepareService.process(
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
                // Sign step
                case StepType.Sign: {
                    await this.closePositionTaskSignService.process(
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
                    await this.closePositionTaskExecuteService.process(
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
            // process confirm
            if (!context.job.tasks[taskIndex].confirmed) {
                await this.closePositionTaskConfirmService.process(
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