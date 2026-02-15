import {
    Injectable 
} from "@nestjs/common"
import {
    BalanceActionService, PrepareTx 
} from "@modules/blockchains"
import {
    InjectPrimaryMongoose,
    JobSchema,
    StepType,
    TaskType,
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    InjectSuperJson 
} from "@modules/mixin"
import SuperJSON from "superjson"
import {
    SendHeartbeatService 
} from "../../send-heartbeat.service"
import {
    WithdrawTaskSignParams 
} from "../types"

/**
 * Service for the WITHDRAW TASK SIGN step.
 */
@Injectable()
export class WithdrawTaskSignService {
    constructor(
    private readonly balanceActionService: BalanceActionService,
    private readonly sendHeartbeatService: SendHeartbeatService,
    @InjectSuperJson()
    private readonly superJson: SuperJSON,
    @InjectPrimaryMongoose()
    private readonly connection: Connection,
    ) {}

    /**
   * Process the WITHDRAW TASK SIGN step.
   * @param params - The parameters for the WITHDRAW TASK SIGN step.
   * @param params.bot - The bot.
   * @param params.job - The job.
   * @param params.bullmqJob - The bullmq job.
   * @param params.taskIndex - The index of the task.
   */
    async process(
        {
            bot,
            job,
            bullmqJob,
            taskIndex,
        }: WithdrawTaskSignParams
    ) {
    // Send heartbeat
        await this.sendHeartbeatService.process(
            {
                bot, 
                job, 
                bullmqJob 
            }
        )

        const activeStep = job.tasks[taskIndex].activeStep ?? 0
        const step = job.tasks[taskIndex].steps?.[activeStep]

        // prepareTx is persisted per-step by prepare service
        const prepareTx = this.superJson.parse<PrepareTx>(step.prepareTx)

        // Sign tx
        const { signedTx } = await this.balanceActionService.signReconcileBalanceTransaction(
            {
                bot,
                prepareTx,
            }
        )

        // Persist signedTx and advance step type to Execute
        await this.connection.model<JobSchema>(JobSchema.name).updateOne(
            {
                _id: job.id 
            },
            {
                $set: {
                    "tasks.$[task].steps.$[step].type": StepType.Execute,
                    "tasks.$[task].steps.$[step].signedTx": this.superJson.stringify(signedTx),
                },
            },
            {
                arrayFilters: [
                    {
                        "task.index": taskIndex, "task.type": TaskType.Withdraw 
                    },
                    {
                        "step.index": activeStep 
                    },
                ],
            },
        )
    }
}