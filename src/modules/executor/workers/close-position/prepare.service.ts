import {
    Injectable 
} from "@nestjs/common"
import {
    PrepareParams,
    PrepareResult,
    ClosePositionJobData,
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
    PrepareClosePositionResult,
} from "@modules/blockchains"
import {
    InjectSuperJson 
} from "@modules/mixin"
import {
    SuperJSON 
} from "superjson"
import {
    ToStringObject 
} from "@modules/typedefs"

@Injectable()
export class PrepareService {
    constructor(
        private readonly winstonService: WinstonService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly closePositionOrchestratorService: ClosePositionOrchestratorService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
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
            dynamicLiquidityPoolInfo,
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
            const { closePositionTransaction } = job.data as ToStringObject<ClosePositionJobData>
            return {
                result: {
                    closePositionTransaction: this.superJson.parse<PrepareClosePositionResult>(closePositionTransaction),
                }
            }
        }
        const closePositionTransaction = await this.closePositionOrchestratorService.prepare(
            {
                bot,
                state: {
                    static: liquidityPool,
                    dynamic: dynamicLiquidityPoolInfo,
                },
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
                    "data.closePositionTransaction": this.superJson.stringify(closePositionTransaction),
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