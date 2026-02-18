import {
    Injectable 
} from "@nestjs/common"
import {
    ReconcileBalanceTaskDispatcherParams 
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
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
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
            bot,
            job,
            payload,
            bullmqJob,
            taskIndex,
            isRetry
        }: ReconcileBalanceTaskDispatcherParams
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
            console.log(`job fetched: ${jobSnapshot.id}`)
            // if we do not find the task persisted in the job snapshot, we have to prepare 
            if (!jobSnapshot.tasks[taskIndex] || jobSnapshot.tasks[taskIndex].initialized === false) {
                console.log("task not found, preparing...")
                await this.reconcileBalanceTaskPrepareService.process(
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
                    console.log("signing...")
                    await this.reconcileBalanceTaskSignService.process(
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
                    console.log("executing...")
                    await this.reconcileBalanceTaskExecuteService.process(
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
                console.log("confirming...")
                await this.reconcileBalanceTaskConfirmService.process(
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