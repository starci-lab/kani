import {
    Injectable 
} from "@nestjs/common"
import {
    WithdrawTaskDispatcherParams 
} from "../types"
import {
    JobSchema,
    StepType,
} from "@modules/databases"
import {
    JobContextNotFoundException,
} from "@modules/exceptions"
import {
    WithdrawTaskPrepareService,
} from "./prepare.service"
import {
    WithdrawTaskSignService,
} from "./sign.service"
import {
    WithdrawTaskExecuteService,
} from "./execute.service"
import {
    WithdrawTaskConfirmService,
} from "./confirm.service"
import {
    LoadJobContextResult,
    JobContextService,
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
        private readonly debugContextService: DebugContextService,
        private readonly debugLatencyService: DebugLatencyService,
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
        jobType,
    }: WithdrawTaskDispatcherParams) {
        // create the context payload for debug latency
        const contextPayload = this.debugContextService.createContextPayload({
            jobType,
            jobId,
            botId,
        })
        this.debugLatencyService.createContext(contextPayload)
        // create the context for debug latency
        let context: LoadJobContextResult | null = null
        do {
            const [_context,
                error] = await this.asyncService.resolveTuple(
                this.jobContextService.load({
                    jobId,
                    botId,
                }),
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
            const task = context.job.tasks[taskIndex]
            if (!task || task.initialized === false) {
                await this.withdrawTaskPrepareService.process({
                    bot: context.bot,
                    job: context.job,
                    payload,
                    bullmqJob,
                    taskIndex,
                    isRetry,
                    jobType,
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
                        jobType,
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
                        jobType,
                    })
                    continue
                }
                }
            }

            if (!task.confirmed) {
                await this.withdrawTaskConfirmService.process({
                    bot: context.bot,
                    job: context.job,
                    payload,
                    bullmqJob,
                    taskIndex,
                    isRetry,
                    jobType,
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