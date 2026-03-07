import {
    Injectable
} from "@nestjs/common"
import {
    BalanceActionService,
    PrepareTx,
} from "@modules/blockchains"
import {
    InjectPrimaryMongoose,
    JobSchema,
    JobType,
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
    TransferFeesTaskSignParams
} from "../types"
import {
    WinstonService,
    WinstonLog,
} from "@modules/winston"
import {
    strict as assert
} from "node:assert"

/**
 * Service for the Transfer Fees Task SIGN step.
 */
@Injectable()
export class TransferFeesTaskSignService {
    constructor(
        private readonly balanceActionService: BalanceActionService,
        private readonly sendHeartbeatService: SendHeartbeatService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
    ) {}

    /**
     * Process the Transfer Fees Task SIGN step.
     */
    async process({
        bot,
        job,
        bullmqJob,
        taskIndex,
    }: TransferFeesTaskSignParams) {
        const stepIndex = job.tasks[taskIndex].activeStep ?? 0
        const step = job.tasks[taskIndex].steps?.[stepIndex]

        try {
            await this.sendHeartbeatService.process({
                bot,
                job,
                bullmqJob,
            })

            const prepareTx = this.superJson.parse<PrepareTx>(step.prepareTx)

            const { signedTx } = await this.balanceActionService.signReconcileBalanceTransaction({
                bot,
                prepareTx,
            })

            const updateJobResult = await this.connection
                .model<JobSchema>(JobSchema.name)
                .updateOne(
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
                                "task.index": taskIndex, "task.type": TaskType.TransferFees 
                            },
                            {
                                "step.index": stepIndex 
                            },
                        ],
                    },
                )

            assert(updateJobResult.matchedCount > 0)

            this.winstonService.log(WinstonLog.ActionJobTaskStepSigned,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: job.type ?? JobType.OpenPosition,
                    taskIndex,
                    taskType: TaskType.TransferFees,
                    stepIndex,
                    metadata: job.metadata,
                })
        } catch (error) {
            this.winstonService.log(WinstonLog.ActionJobTaskStepSignedFailed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: job.type ?? JobType.OpenPosition,
                    taskIndex,
                    taskType: TaskType.TransferFees,
                    stepIndex,
                    error: error.message,
                    metadata: job.metadata,
                })
            throw error
        }
    }
}
