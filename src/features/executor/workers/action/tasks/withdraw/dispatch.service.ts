import {
    Injectable 
} from "@nestjs/common"
import {
    WithdrawTaskDispatcherParams 
} from "../types"
import {
    InjectPrimaryMongoose, 
    JobSchema,
    StepType
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    JobNotFoundException 
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
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
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
            bot,
            job,
            payload,
            bullmqJob,
            taskIndex,
            isRetry
        }: WithdrawTaskDispatcherParams
    ) {
        let jobSnapshot: JobSchema | null = null
        // do the loop until the task is completed
        do {
            // we retrieve the latest job snapshot
            jobSnapshot = await this.connection
                .model<JobSchema>(JobSchema.name)
                .findById(job.id)
            if (!jobSnapshot) {
                throw new JobNotFoundException({
                    jobId: job.id,
                })
            }
            // if we do not find the task persisted in the job snapshot, we have to prepare 
            if (!jobSnapshot.tasks[taskIndex]) {
                await this.withdrawTaskPrepareService.process(
                    {
                        bot,
                        job: jobSnapshot,
                        payload,
                        bullmqJob,
                        taskIndex,
                        isRetry,
                    }
                )
                continue
            }
            // we take the next step
            const activeStep = jobSnapshot.tasks[taskIndex].activeStep
            const stepCount = jobSnapshot.tasks[taskIndex].stepCount
            if (activeStep <= stepCount - 1) {
                // get the current step type
                const stepType = jobSnapshot.tasks[taskIndex].steps[activeStep].type
                switch (stepType) {
                // Sign step
                case StepType.Sign: {
                    await this.withdrawTaskSignService.process(
                        {
                            bot,
                            job: jobSnapshot,
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
                            bot,
                            job: jobSnapshot,
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
            if (!jobSnapshot.tasks[taskIndex].confirmed) {
                await this.withdrawTaskConfirmService.process(
                    {
                        bot,
                        job: jobSnapshot,
                        payload,
                        bullmqJob,
                        taskIndex,
                        isRetry,
                    }
                )
            }
        } while (
            !this.isTaskCompleted(
                jobSnapshot,
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