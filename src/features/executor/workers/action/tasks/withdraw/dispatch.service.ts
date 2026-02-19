import {
    Injectable
} from "@nestjs/common"
import {
    WithdrawTaskDispatcherParams
} from "../types"
import {
    JobSchema,
    StepType
} from "@modules/databases"
import {
    JobContextNotFoundException,
} from "@modules/exceptions"
import {
    WithdrawTaskPrepareService
} from "./prepare.service"
import {
    WithdrawTaskSignService
} from "./sign.service"
import {
    WithdrawTaskExecuteService
} from "./execute.service"
import {
    WithdrawTaskConfirmService
} from "./confirm.service"
import {
    LoadJobContextResult, JobContextService 
} from "../../context"
import {
    AsyncService 
} from "@modules/mixin"

/**
 * Dispatcher service for the WITHDRAW task.
 */
@Injectable()
export class WithdrawTaskDispatchService {
    constructor(
        private readonly withdrawTaskPrepareService: WithdrawTaskPrepareService,
        private readonly withdrawTaskSignService: WithdrawTaskSignService,
        private readonly withdrawTaskExecuteService: WithdrawTaskExecuteService,
        private readonly withdrawTaskConfirmService: WithdrawTaskConfirmService,
        private readonly asyncService: AsyncService,
        private readonly jobContextService: JobContextService,
    ) { }

    /**
     * Dispatch the WITHDRAW task.
     * @param params - The parameters for the WITHDRAW task.
     * @param params.bot - The bot.
     * @param params.job - The job.
     * @param params.payload - The payload.
     * @param params.isRetry - Whether the task is being retried.
     * @param params.taskIndex - The index of the task.
     */
    async dispatch(
        {
            botId,
            jobId,
            payload,
            bullmqJob,
            taskIndex,
            isRetry,
        }: WithdrawTaskDispatcherParams
    ) {
        let context: LoadJobContextResult | null = null
        // do the loop until the task is completed
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
            // if we do not find the task persisted in the job snapshot, we have to prepare 
            if (!context.job.tasks[taskIndex] || context.job.tasks[taskIndex].initialized === false) {
                await this.withdrawTaskPrepareService.process(
                    {
                        bot: context.bot,
                        job: context.job,
                        payload,
                        bullmqJob,
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
                    await this.withdrawTaskSignService.process(
                        {
                            bot: context.bot,
                            job: context.job,
                            payload,
                            bullmqJob,
                            taskIndex,
                            isRetry,
                        }
                    )
                    continue
                }
                // Execute step
                case StepType.Execute: {
                    await this.withdrawTaskExecuteService.process(
                        {
                            bot: context.bot,
                            job: context.job,
                            payload,
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
                await this.withdrawTaskConfirmService.process(
                    {
                        bot: context.bot,
                        job: context.job,
                        payload,
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