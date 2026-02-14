import {
    Injectable 
} from "@nestjs/common"
import {
    SignedTx,
    BalanceActionService
} from "@modules/blockchains"
import {
    InjectPrimaryMongoose,
    JobSchema, 
    StepType, 
    TaskType 
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    InjectSuperJson 
} from "@modules/mixin"
import SuperJSON from "superjson"
import {
    ReconcileBalanceTaskExecuteParams 
} from "../types"
import {
    SendHeartbeatService 
} from "../../send-heartbeat.service"
import {
    JobFailureException,
    JobFailureStrategy,
    SignedTxNotFoundException 
} from "@modules/exceptions"
import {
    envConfig 
} from "@modules/env"

/**
 * Service for the Reconcile Balance Task EXECUTE step.
 */
@Injectable()
export class ReconcileBalanceTaskExecuteService {
    constructor(
        private readonly balanceActionService: BalanceActionService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly sendHeartbeatService: SendHeartbeatService,
    ) { }
    
    /**
     * Process the Reconcile Balance Task EXECUTE step.
     * @param params - The parameters for the Reconcile Balance Task EXECUTE step.
     * @param params.bot - The bot.
     * @param params.job - The job.
     * @param params.taskIndex - The index of the task.
     * @param params.bullmqJob - The bullmq job.
     */
    async process({
        bot,
        job,
        isRetry,
        bullmqJob,
        taskIndex,
    }: ReconcileBalanceTaskExecuteParams) {
        // send heartbeat
        await this.sendHeartbeatService.process(
            {
                bot,
                job,
                bullmqJob,
            }
        )
        // get the previous attempts
        const hasPreviousAttempts = bullmqJob.attemptsMade > 0
        // get the active step
        const stepIndex = job.tasks[taskIndex].activeStep ?? 0
        // get the step
        const step = job.tasks[taskIndex].steps?.[stepIndex]
        // get the signed tx
        const signedTx = step?.signedTx
        // if the signed tx is not found, throw an error
        if (!signedTx) {
            throw new JobFailureException({
                originalError: new SignedTxNotFoundException({
                    botId: bot.id,
                    jobId: job.id,
                    taskIndex,
                    stepIndex,
                }),
                strategy: JobFailureStrategy.Fatal,
            })
        }
        // execute the signed tx
        const executeResult = await this.balanceActionService.executeReconcileBalanceTransaction(
            {
                bot,
                txCheck: (hasPreviousAttempts || isRetry) ?? false,
                stimulate: envConfig().executor.runtime.operation.reconcileBalance.stimulate,
                signedTx: this.superJson.parse<SignedTx>(signedTx),
            }
        )
        // update the job with the execute result
        await this.connection.model<JobSchema>(JobSchema.name).updateOne(
            {
                _id: job.id 
            },
            {
                $set: {
                    "tasks.$[task].steps.$[step].executeResult": this.superJson.stringify(executeResult),
                    "tasks.$[task].steps.$[step].type": StepType.Execute,
                },
                // Move to next step
                $inc: {
                    "tasks.$[task].activeStep": 1,
                },
            },
            {
                arrayFilters: [
                    {
                        "task.index": taskIndex, 
                        "task.type": TaskType.ReconcileBalance 
                    },
                    {
                        "step.index": stepIndex 
                    },
                ],
            },
        )
    }
}