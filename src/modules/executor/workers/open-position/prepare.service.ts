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
    OpenPositionActionService,
    PrepareOpenPositionResult  
} from "@modules/blockchains"
import {
    SuperJSON
} from "superjson"
import {
    InjectSuperJson,
    DayjsService
} from "@modules/mixin"
import {
    ToStringObject 
} from "@modules/common"
import {
    AsyncService 
} from "@modules/mixin"
import {
    OpenPositionJobPreparedFailedException,
} from "@modules/exceptions"
import {
    FatalError 
} from "../fatal"

@Injectable()
export class PrepareService {
    constructor(
        private readonly winstonService: WinstonService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly openPositionActionService: OpenPositionActionService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly dayjsService: DayjsService,
        private readonly asyncService: AsyncService,
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
            liquidityPool,
        }: PrepareParams
    ): Promise<PrepareResult> {
        // Guard: if job already passed PENDING phase, do nothing
        // This prevents duplicate preparation on retry or replay
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Prepared)
        ) {
            const { openPositionTransaction: stringifiedOpenPositionTransaction } = job.data as ToStringObject<OpenPositionJobData>
            const openPositionTransaction = this.superJson.parse<PrepareOpenPositionResult>(stringifiedOpenPositionTransaction)

            this.winstonService.log(
                WinstonLog.OpenPositionJobAlreadyPrepared,
                {
                    botId: bot.id,
                    jobId: job.id,
                    liquidityPoolId: liquidityPool.displayId,  
                    txHashes: openPositionTransaction.prepareTxs.map((prepareTx) => prepareTx.txHash),
                    ageMs: this.dayjsService.now().diff(job.createdAt,
                        "millisecond"),
                }
            )
            return {
                result: {
                    openPositionTransaction,
                }
            }
        }
        const [
            openPositionTransaction,
            error
        ] =  await this.asyncService.resolveTuple(
            this.openPositionActionService.prepare(
                {
                    bot,
                    liquidityPool,
                    state,
                }
            )
        )
        if (error) {
            // create a failed error
            const failedError = new OpenPositionJobPreparedFailedException({
                originalError: error,
                botId: bot.id,
                jobId: job.id,
                liquidityPoolId: liquidityPool.displayId,
            }
            )
            // throw everything as a fatal error to stop the job
            throw new FatalError(failedError.toJSON())
        }
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
        this.winstonService.log(
            WinstonLog.OpenPositionJobPrepared,
            {
                botId: bot.id,
                jobId: job.id,
                txHashes: openPositionTransaction.prepareTxs.map((prepareTx) => prepareTx.txHash),
                liquidityPoolId: liquidityPool.displayId,
            }
        )
        return {
            result: {
                openPositionTransaction,
            }
        }
    }
}