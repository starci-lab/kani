import {
    Injectable 
} from "@nestjs/common"
import type {
    OpenPositionJobData,
    PrepareParams,
    PrepareResult,
} from "./types"
import {
    getJobStatusOrder,
    InjectPrimaryMongoose,
    JobStatus,
    JobSchema
} from "@modules/databases"
import {
    WinstonLog, WinstonService
} from "@modules/winston"
import {
    Connection 
} from "mongoose"
import {
    OpenPositionActionService, 
} from "@modules/blockchains"
import {
    DayjsService,
    AsyncService
} from "@modules/mixin"
import {
    JobFailureException,
    JobFailureStrategy,
    OpenPositionJobPreparedFailedException,
    PrepareOpenPositionResultNotFoundException,
} from "@modules/exceptions"
import {
    SerializerService 
} from "../common"
import {
    ToStringObject 
} from "@modules/common"

/**
 * Service for the PREPARE phase of open-position jobs.
 *
 * @example
 * const result = await prepareService.process({ job, bot, liquidityPool, state })
 */
@Injectable()
export class PrepareService {
    constructor(
        private readonly winstonService: WinstonService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly openPositionActionService: OpenPositionActionService,
        private readonly dayjsService: DayjsService,
        private readonly asyncService: AsyncService,
        private readonly serializerService: SerializerService,
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
        params: PrepareParams
    ): Promise<PrepareResult> {
        const { job, bot, liquidityPool, state } = params
        // Guard: if job already passed PENDING phase, do nothing
        // This prevents duplicate preparation on retry or replay
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Prepared)
        ) {
            const jobData = this.serializerService.deserialize<OpenPositionJobData>(
                job.data as Partial<ToStringObject<OpenPositionJobData>>
            )
            this.winstonService.log(
                WinstonLog.OpenPositionJobAlreadyPrepared,
                {
                    botId: bot.id,
                    jobId: job.id,
                    liquidityPoolId: liquidityPool.displayId,  
                    txHashes: jobData?.prepareResult?.prepareTxs.map((prepareTx) => prepareTx.txHash) || [],
                    ageMs: this.dayjsService.now().diff(job.createdAt,
                        "millisecond"),
                }
            )
            return {
                data: jobData,
            }
        }
        const [
            prepareResult,
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
            console.log("error",
                error)
            throw new JobFailureException({
                strategy: JobFailureStrategy.Fatal,
                originalError: new OpenPositionJobPreparedFailedException({
                    originalError: error,
                    botId: bot.id,
                    jobId: job.id,
                    liquidityPoolId: liquidityPool.displayId,
                }),
            })
        }
        if (!prepareResult) {
            throw new PrepareOpenPositionResultNotFoundException({
                botId: bot.id,
                jobId: job.id,
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        const data = this.serializerService.serialize<Partial<OpenPositionJobData>>({
            prepareResult,
        })
        await this.connection.model<JobSchema>(JobSchema.name).updateOne(
            {
                _id: {
                    $eq: job._id,
                },
            },
            {
                $set: {
                    status: JobStatus.Prepared,
                    ...data,
                },
            }
        )
        this.winstonService.log(
            WinstonLog.OpenPositionJobPrepared,
            {
                botId: bot.id,
                jobId: job.id,
                txHashes: prepareResult.prepareTxs.map(
                    (prepareTx) => prepareTx.txHash
                ),
                liquidityPoolId: liquidityPool.displayId,
            }
        )
        return {
            data: {
                prepareResult,
            },
        }
    }
}