import {
    Injectable
} from "@nestjs/common"
import {
    TransferFeesTaskConfirmService
} from "./confirm.service"
import {
    TransferFeesTaskDispatcherParams
} from "../types"
import {
    JobSchema,
    StepType,
} from "@modules/databases"
import {
    JobContextNotFoundException
} from "@modules/exceptions"
import {
    TransferFeesTaskPrepareService
} from "./prepare.service"
import {
    TransferFeesTaskSignService
} from "./sign.service"
import {
    TransferFeesTaskExecuteService
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
 * Dispatcher service for the TRANSFER FEES task.
 */
@Injectable()
export class TransferFeesTaskDispatchService {
    constructor(
        private readonly transferFeesTaskPrepareService: TransferFeesTaskPrepareService,
        private readonly transferFeesTaskSignService: TransferFeesTaskSignService,
        private readonly transferFeesTaskExecuteService: TransferFeesTaskExecuteService,
        private readonly transferFeesTaskConfirmService: TransferFeesTaskConfirmService,
        private readonly asyncService: AsyncService,
        private readonly jobContextService: JobContextService,
        private readonly debugContextService: DebugContextService,
        private readonly debugLatencyService: DebugLatencyService,
    ) {}

    /**
     * Dispatch the TRANSFER FEES task.
     */
    async dispatch({
        botId,
        jobId,
        payload,
        bullmqJob,
        taskIndex,
        isRetry,
        jobType,
    }: TransferFeesTaskDispatcherParams) {
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
            const task = context.job.tasks[taskIndex]
            if (!task || task.initialized === false) {
                await this.transferFeesTaskPrepareService.process({
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

            if (activeStep <= stepCount - 1) {
                const stepType = task.steps[activeStep].type
                switch (stepType) {
                case StepType.Sign: {
                    await this.transferFeesTaskSignService.process({
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
                    await this.transferFeesTaskExecuteService.process({
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
                await this.transferFeesTaskConfirmService.process({
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

    private isTaskCompleted(job: JobSchema | null, taskIndex: number) {
        const task = job?.tasks[taskIndex]
        if (!task) return false
        return task.activeStep >= task.stepCount
    }
}
