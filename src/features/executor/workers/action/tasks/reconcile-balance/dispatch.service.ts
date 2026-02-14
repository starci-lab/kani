import {
    Injectable 
} from "@nestjs/common"
import {
    ClosePositionTaskExecuteService 
} from "./execute.service"
import {
    ClosePositionTaskPrepareService 
} from "./prepare.service"
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
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
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
            bot,
            job,
            liquidityPool,
            state,
            payload,
            bullmqJob,
            taskIndex,
            isRetry
        }: ClosePositionTaskDispatcherParams
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
                await this.closePositionTaskPrepareService.process(
                    {
                        bot,
                        job: jobSnapshot,
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
            const activeStep = jobSnapshot.tasks[taskIndex].activeStep
            const stepCount = jobSnapshot.tasks[taskIndex].stepCount
            if (activeStep <= stepCount - 1) {
                // get the current step type
                const stepType = jobSnapshot.tasks[taskIndex].steps[activeStep].type
                switch (stepType) {
                // Sign step
                case StepType.Sign: {
                    await this.closePositionTaskSignService.process(
                        {
                            bot,
                            job: jobSnapshot,
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
                            bot,
                            job: jobSnapshot,
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
            if (!jobSnapshot.tasks[taskIndex].confirmed) {
                await this.closePositionTaskConfirmService.process(
                    {
                        bot,
                        job: jobSnapshot,
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