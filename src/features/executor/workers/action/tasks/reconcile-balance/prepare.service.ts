import {
    Injectable
} from "@nestjs/common"
import {
    BalanceActionService 
} from "@modules/blockchains"
import {
    InjectPrimaryMongoose, JobSchema,
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
/**
 * Service for the Close Position Task PREPARE step.
 */
@Injectable()
export class ReconcileBalanceTaskPrepareService {
    constructor(
        private readonly balanceActionService: BalanceActionService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
    ) { }

    /**
     * Process the Close Position Task PREPARE step.
     *
     * @param params - The parameters for the step.
     * @returns The result of the step.
     */
    async process(
        {
            bot,
            job,
            payload,
        }: ReconcileBalanceTaskBaseParams
    ) {
        // We need validation here
        // Thus, we need to prepare
        const prepareResult =
            await this.balanceActionService.prepareReconcileBalanceTransaction(
                {
                    bot,
                    tokenInputs: [],
                }
            )
        // We update the database with the prepare result.
        await this.connection.model<JobSchema>(
            JobSchema.name
        ).updateOne(
            {
                _id: {
                    $eq: jobId,
                },
            },
            {
                // Update the prepare result for the task.
                $set: {
                    "tasks.$[task].prepareResult": this.superJson.stringify(prepareResult),
                    "tasks.$[task].activeStep": 0,
                    "tasks.$[task].steps": prepareResult.prepareTxs.map(
                        (prepareTx) => (
                            {
                                type: StepType.Sign,
                                signParams: prepareTx.serializedTx,
                            }
                        )
                    ),
                },
            },
            {
                // Update the task with the given index and type.
                arrayFilters: [
                    {
                        "task.index": index,
                        "task.type": TaskType.OpenPosition,
                    }
                ],
            },
        )
    }
}