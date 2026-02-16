import {
    Injectable
} from "@nestjs/common"
import {
    ClosePositionActionService,
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
    ClosePositionTaskPrepareParams 
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
    JobFailureException, 
} from "@modules/exceptions"
import {
    JobFailureStrategy 
} from "@modules/common"
import {
    strict as assert 
} from "node:assert"
/**
 * Service for the Close Position Task PREPARE step.
 */
@Injectable()
export class ClosePositionTaskPrepareService {
    constructor(
        private readonly closePositionActionService: ClosePositionActionService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly sendHeartbeatService: SendHeartbeatService,
        private readonly winstonService: WinstonService,
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
            state,
            taskIndex,
            bullmqJob,
            liquidityPool,
        }: ClosePositionTaskPrepareParams
    ) {
        try {
        // Send heartbeat
            await this.sendHeartbeatService.process(
                {
                    bot,
                    job,
                    bullmqJob,
                    fatal: true,
                }
            )
            // We prepare the close position transaction.
            const prepareResult =
            await this.closePositionActionService.prepare(
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
                            type: TaskType.ClosePosition,
                            prepareResult: this.superJson.stringify(prepareResult),
                            activeStep: 0,
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
                    type: JobType.ClosePosition,
                    txCount: prepareResult.prepareTxs.length,
                    metadata: job.metadata,
                    taskIndex,
                    taskType: TaskType.ClosePosition,
                }
            )
        } catch (error) 
        {
            this.winstonService.log(
                WinstonLog.ActiveJobTaskPreparedFailed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: JobType.ClosePosition,
                    error: error.message,
                    taskIndex,
                    taskType: TaskType.ClosePosition,
                    metadata: job.metadata,
                }
            )
            // log the error
            throw new JobFailureException(
                {
                    originalError: error,
                    strategy: JobFailureStrategy.Fatal,
                }
            )
        }
    }
}