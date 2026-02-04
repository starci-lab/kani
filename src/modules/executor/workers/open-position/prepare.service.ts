import {
    Injectable 
} from "@nestjs/common"
import {
    PrepareParams,
    PrepareResult,
    OpenPositionJobData,
} from "./types"
import {
    getJobStatusOrder,
    InjectPrimaryMongoose,
    JobStatus,
} from "@modules/databases"
import {
    JobSchema,
} from "@modules/databases"
import {
    WinstonLog, WinstonService
} from "@modules/winston"
import {
    Connection 
} from "mongoose"
import {
    OpenPositionActionService
} from "@modules/blockchains/dexes/orchestrator"
import {
    PrepareOpenPositionResult
} from "@modules/blockchains/interfaces"
import {
    SuperJSON
} from "superjson"
import {
    InjectSuperJson 
} from "@modules/mixin"
import {
    ToStringObject 
} from "@modules/typedefs"

@Injectable()
export class PrepareService {
    constructor(
        private readonly winstonService: WinstonService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly openPositionActionService: OpenPositionActionService,
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
     * Prepares an "open position" transaction via `OpenPositionOrchestratorService`
     * and persists a state transition: PENDING → PREPARED (including
     * `metadata.openPositionTransaction`).
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
                WinstonLog.OpenPositionJobAlreadyPrepared,
                {
                    botId: bot.id,
                    jobId: job.id,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
            const { openPositionTransaction } = job.data as ToStringObject<OpenPositionJobData>
            return {
                result: {
                    openPositionTransaction: this.superJson.parse<PrepareOpenPositionResult>(openPositionTransaction),
                }
            }
        }
        const openPositionTransaction = await this.openPositionActionService.prepare(
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
                    "data.openPositionTransaction": this.superJson.stringify(openPositionTransaction),
                },
            }
        )
        return {
            result: {
                openPositionTransaction,
            }
        }
    }
}