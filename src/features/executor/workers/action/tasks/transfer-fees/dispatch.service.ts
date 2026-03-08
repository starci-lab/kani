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
    StepType
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
    LoadJobContextResult
} from "../../context"
import {
    AsyncService
} from "@modules/mixin"

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
    }: TransferFeesTaskDispatcherParams) {
        let context: LoadJobContextResult | null = null

        do {
            const [
                _context,
                error
            ] = await this.asyncService.resolveTuple(
                this.jobContextService.load(
                    {
                        jobId, botId 
                    }
                ),
            )
            context = _context
            if (error) {
                throw error
            }
            if (!context) {
                throw new JobContextNotFoundException({
                    jobId, botId 
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
