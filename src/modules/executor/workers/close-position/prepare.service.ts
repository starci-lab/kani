import {
    Injectable 
} from "@nestjs/common"
import {
    PrepareParams,
    PrepareResult,
    ClosePositionJobMetadata,
} from "./types"
import {
    getJobStatusOrder,
    InjectPrimaryMongoose,
    JobStatus,
} from "@modules/databases"
import {
    JobSchema
} from "@modules/databases"
import {
    WinstonLog, WinstonService
} from "@modules/winston"
import {
    Connection 
} from "mongoose"
import {
    ClosePositionOrchestratorService,
} from "@modules/blockchains"

@Injectable()
export class PrepareService {
    constructor(
        private readonly winstonService: WinstonService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly closePositionOrchestratorService: ClosePositionOrchestratorService,
    ) {}

    // Phase: PREPARE
    // Responsibility:
    // - Build the open-position transaction (no execution here)
    // - Persist job metadata required for execution phase
    // - Transition job state from PENDING → PREPARED
    // Notes:
    // - This phase must be idempotent
    // - Safe to re-enter on retry/replay
    /**
     * PREPARE phase.
     *
     * Prepares a "close position" transaction via `ClosePositionOrchestratorService`
     * and persists a state transition: PENDING → PREPARED (including
     * `metadata.closePositionTransaction`).
     *
     * Idempotency: if the job is already at/after PREPARED, returns the previously
     * persisted metadata instead of recomputing.
     */
    async process(
        {
            job,
            bot, 
            state,
            liquidityPool,
        }: PrepareParams
    ): Promise<PrepareResult> {
        // Guard: if job already passed PENDING phase, do nothing
        // This prevents duplicate preparation on retry or replay
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Prepared)
        ) {
            this.winstonService.log(
                WinstonLog.ClosePositionJobAlreadyPrepared,
                {
                    botId: bot.id,
                    jobId: job.id,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
            return {
                result: job.metadata as ClosePositionJobMetadata
            }
        }
        const closePositionTransaction = await this.closePositionOrchestratorService.prepare(
            {
                bot,
                state,
            }
        )
        await this.connection.model<JobSchema>(JobSchema.name).updateOne(
            {
                _id: {
                    $eq: job._id,
                },
            },
            {
                $set: {
                    status: JobStatus.Prepared,
                    "metadata.closePositionTransaction": closePositionTransaction,
                },
            }
        )
        return {
            result: {
                closePositionTransaction,
            }
        }
    }
}