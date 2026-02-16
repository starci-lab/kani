import {
    Injectable
} from "@nestjs/common"
import {
    OpenPositionActionService,
} from "@modules/blockchains"
import {
    InjectPrimaryMongoose, JobSchema,
    JobType,
    StepType,
    TaskType
} from "@modules/databases"
import {
    Connection
} from "mongoose"
import {
    OpenPositionTaskPrepareParams
} from "../types"
import {
    InjectSuperJson 
} from "@modules/mixin"
import SuperJSON from "superjson"
import {
    SendHeartbeatService 
} from "../../send-heartbeat.service"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"
import {
    strict as assert 
} from "node:assert"
/**
 * Service for the Open Position Task PREPARE step.
 */
@Injectable()
export class OpenPositionTaskPrepareService {
    constructor(
        private readonly openPositionActionService: OpenPositionActionService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly sendHeartbeatService: SendHeartbeatService,
        private readonly winstonService: WinstonService,
    ) { }

    /**
     * Process the Open Position Task PREPARE step.
     *
     * @param params - The parameters for the step.
     * @returns The result of the step.
     */
    async process(
        {
            bot,
            job,
            liquidityPool,
            state,
            taskIndex,
            bullmqJob,
        }: OpenPositionTaskPrepareParams
    ) {
        try {
            // send heartbeat
            await this.sendHeartbeatService.process(
                {
                    bot,
                    job,
                    bullmqJob,
                }
            )
            // we prepare the open position transaction.
            const prepareResult =
            await this.openPositionActionService.prepare(
                {
                    bot,
                    liquidityPool,
                    state,
                }
            )
            // We update the database with the prepare result.
            const updateJobResult = await this.connection.model<JobSchema>(
                JobSchema.name
            ).updateOne(
                {
                    _id: job.id,
                },
                {
                    $push: {
                        tasks: {
                            index: taskIndex,
                            type: TaskType.OpenPosition,
                            prepareResult: this.superJson.stringify(prepareResult),
                            activeStep: 0,
                            openPositionStepIndex: 0,
                            stepCount: prepareResult.prepareTxs.length,
                            steps: prepareResult.prepareTxs.map(
                                (prepareTx, index) => (
                                    {
                                        index,
                                        type: StepType.Sign,
                                        prepareTx: this.superJson.stringify(prepareTx),
                                    }
                                )
                            ),
                        },
                    },
                },
            )
            assert(updateJobResult.matchedCount > 0)
            this.winstonService.log(
                WinstonLog.ActiveJobTaskPrepared,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: JobType.OpenPosition,
                    txCount: prepareResult.prepareTxs.length,
                    metadata: job.metadata,
                    taskIndex,
                    taskType: TaskType.OpenPosition,
                }
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.ActiveJobTaskPreparedFailed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: JobType.OpenPosition,
                    error: error.message,
                    taskIndex,
                    taskType: TaskType.OpenPosition,
                    metadata: job.metadata,
                }
            )
            throw error
        }
    }
}