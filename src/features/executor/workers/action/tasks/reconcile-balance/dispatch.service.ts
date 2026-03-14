import {
    Injectable
} from "@nestjs/common"
import {
    ReconcileBalanceTaskDispatcherParams
} from "../types"
import {
    JobSchema,
    StepType
} from "@modules/databases"
import {
    JobContextNotFoundException 
} from "@modules/exceptions"
import {
    ReconcileBalanceTaskPrepareService
} from "./prepare.service"
import {
    ReconcileBalanceTaskSignService
} from "./sign.service"
import {
    ReconcileBalanceTaskExecuteService
} from "./execute.service"
import {
    ReconcileBalanceTaskConfirmService
} from "./confirm.service"
import {
    LoadJobContextResult, JobContextService
} from "../../context"
import {
    AsyncService
} from "@modules/mixin"
import {
    DebugContextService 
} from "../debug-context.service"
import {
    DebugLatencyService 
} from "@modules/debug"
/**
 * Dispatcher service for the RECONCILE BALANCE task.
 */
@Injectable()
export class ReconcileBalanceTaskDispatchService {
    constructor(
        private readonly reconcileBalanceTaskPrepareService: ReconcileBalanceTaskPrepareService,
        private readonly reconcileBalanceTaskSignService: ReconcileBalanceTaskSignService,
        private readonly reconcileBalanceTaskExecuteService: ReconcileBalanceTaskExecuteService,
        private readonly reconcileBalanceTaskConfirmService: ReconcileBalanceTaskConfirmService,
        private readonly asyncService: AsyncService,
        private readonly jobContextService: JobContextService,
        private readonly debugContextService: DebugContextService,
        private readonly debugLatencyService: DebugLatencyService,
    ) { }

    /**
     * Dispatch the RECONCILE BALANCE task.
     * @param params - The parameters for the RECONCILE BALANCE task.
     * @param params.bot - The bot.
     * @param params.job - The job.
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
            jobType,
        }: ReconcileBalanceTaskDispatcherParams
    ) {
        // create the context payload for debug latency
        const contextPayload = this.debugContextService.createContextPayload({
            jobType,
            jobId: jobId,
            botId: botId,
        })
        this.debugLatencyService.createContext(contextPayload)
        // create the context for debug latency
        let context: LoadJobContextResult | null = null
        // do the loop until the task is completed
        do {
            // we retrieve the latest job snapshot
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
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Job context loaded successfully",
            })
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
                await this.reconcileBalanceTaskPrepareService.process(
                    {
                        bot: context.bot,
                        job: context.job,
                        payload,
                        bullmqJob,
                        taskIndex,
                        isRetry,
                        jobType,
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
                    await this.reconcileBalanceTaskSignService.process(
                        {
                            bot: context.bot,
                            job: context.job,
                            payload,
                            bullmqJob,
                            taskIndex,
                            isRetry,
                            jobType,
                        }
                    )
                    continue
                }
                // Execute step
                case StepType.Execute: {
                    await this.reconcileBalanceTaskExecuteService.process(
                        {
                            bot: context.bot,
                            job: context.job,
                            payload,
                            bullmqJob,
                            taskIndex,
                            isRetry,
                            jobType,
                        }
                    )
                    continue
                }
                }
            }
            // process confirm
            if (!context.job.tasks[taskIndex].confirmed) {
                await this.reconcileBalanceTaskConfirmService.process(
                    {
                        bot: context.bot,
                        job: context.job,
                        payload,
                        bullmqJob,
                        taskIndex,
                        isRetry,
                        jobType,
                    }
                )
            }
        } while(
            !this.isTaskCompleted(
                context.job,
                taskIndex,
            )
        )
    }

    /**
     * Checks if the task is complete.
     * @param job - The job.
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