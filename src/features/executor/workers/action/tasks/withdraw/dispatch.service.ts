import {
    Injectable 
} from "@nestjs/common"
import {
    WithdrawTaskDispatcherParams 
} from "../types"
import {
    JobSchema, StepType 
} from "@modules/databases"
import {
    JobContextNotFoundException 
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
    ) {}

    /**
   * Dispatch the WITHDRAW task.
   */
    async dispatch({
        botId,
        jobId,
        payload,
        bullmqJob,
        taskIndex,
        isRetry,
    }: WithdrawTaskDispatcherParams) {
        let context: LoadJobContextResult | null = null

        // loop until task completed
        do {
            // always load latest job snapshot
            const [_context,
                error] = await this.asyncService.resolveTuple(
                this.jobContextService.load({
                    jobId,
                    botId,
                }),
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

            const task = context.job.tasks[taskIndex]

            // prepare if task not found or not initialized
            if (!task || task.initialized === false) {
                await this.withdrawTaskPrepareService.process({
                    bot: context.bot,
                    job: context.job,
                    payload,
                    bullmqJob,
                    taskIndex,
                    isRetry,
                })
                continue
            }

            const activeStep = task.activeStep
            const stepCount = task.stepCount

            // process step (Sign/Execute) when still in steps range
            if (activeStep <= stepCount - 1) {
                const stepType = task.steps[activeStep].type

                switch (stepType) {
                case StepType.Sign: {
                    await this.withdrawTaskSignService.process({
                        bot: context.bot,
                        job: context.job,
                        payload,
                        bullmqJob,
                        taskIndex,
                        isRetry,
                    })
                    continue
                }

                case StepType.Execute: {
                    await this.withdrawTaskExecuteService.process({
                        bot: context.bot,
                        job: context.job,
                        payload,
                        bullmqJob,
                        taskIndex,
                        isRetry,
                    })
                    continue
                }
                }
            }

            // confirm after all steps executed
            if (!task.confirmed) {
                await this.withdrawTaskConfirmService.process({
                    bot: context.bot,
                    job: context.job,
                    payload,
                    bullmqJob,
                    taskIndex,
                    isRetry,
                })
            }
        } while (!this.isTaskCompleted(context.job,
            taskIndex))
    }

    /**
   * Checks if the task is complete.
   */
    private isTaskCompleted(job: JobSchema | null, taskIndex: number) {
        const task = job?.tasks[taskIndex]
        if (!task) return false
        return task.activeStep >= task.stepCount
    }
}