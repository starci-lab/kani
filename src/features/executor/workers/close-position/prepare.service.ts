import {
    Injectable,
} from "@nestjs/common"
import type {
    PrepareParams,
    PrepareResult,
    ClosePositionJobData,
} from "./types"
import {
    getJobStatusOrder,
    InjectPrimaryMongoose,
    JobSchema,
    JobStatus,
} from "@modules/databases"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"
import {
    Connection,
} from "mongoose"
import {
    ClosePositionActionService,
} from "@modules/blockchains"
import {
    DayjsService,
    AsyncService,
} from "@modules/mixin"
import {
    JobFailureException,
    JobFailureStrategy,
    PrepareClosePositionResultNotFoundException,
} from "@modules/exceptions"
import {
    ToStringObject,
} from "@modules/common"
import {
    SerializerService,
} from "../common"

/**
 * Service for the PREPARE phase of close-position jobs.
 *
 * @example
 * const result = await prepareService.process({ job, bot, liquidityPool, ... })
 */
@Injectable()
export class PrepareService {
    constructor(
        private readonly winstonService: WinstonService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly closePositionActionService: ClosePositionActionService,
        private readonly dayjsService: DayjsService,
        private readonly asyncService: AsyncService,
        private readonly serializerService: SerializerService,
    ) {}

    /**
     * PREPARE phase: prepares close-position transaction, persists PENDING → PREPARED.
     *
     * @param params - Prepare params (job, bot, liquidityPool, dynamicLiquidityPoolInfo, ...)
     * @returns Prepare result with closePositionTransaction data
     *
     * @example
     * const result = await prepareService.process({ job, bot, liquidityPool, ... })
     */
    async process(
        {
            job,
            bot,
            state,
            liquidityPool,
        }: PrepareParams
    ): Promise<PrepareResult> {
        // guard: idempotency (return persisted data if already prepared)
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Prepared)
        ) {
            const jobData = this.serializerService.deserialize<ClosePositionJobData>(
                job.data as Partial<ToStringObject<ClosePositionJobData>>
            )
            this.winstonService.log(
                WinstonLog.ClosePositionJobAlreadyPrepared,
                {
                    botId: bot.id,
                    jobId: job.id,
                    liquidityPoolId: liquidityPool.displayId,
                    txHashes: jobData?.prepareResult?.prepareTxs?.map((prepareTx) => prepareTx.txHash) ?? [],
                    ageMs: this.dayjsService.now().diff(
                        job.createdAt,
                        "millisecond",
                    ),
                }
            )
            return {
                data: jobData,
            }
        }
        const [
            prepareResult,
            error,
        ] = await this.asyncService.resolveTuple(
            this.closePositionActionService.prepare(
                {
                    bot,
                    liquidityPool,
                    state,
                }
            )
        )
        if (error) {
            throw new JobFailureException({
                originalError: error,
                strategy: JobFailureStrategy.Fatal,
            })
        }
        if (!prepareResult) {
            throw new PrepareClosePositionResultNotFoundException({
                botId: bot.id,
                jobId: job.id,
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        // persist job: PENDING → PREPARED
        const data = this.serializerService.serialize<Partial<ClosePositionJobData>>({
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
            WinstonLog.ClosePositionJobPrepared,
            {
                botId: bot.id,
                jobId: job.id,
                txHashes: prepareResult.prepareTxs.map((prepareTx) => prepareTx.txHash),
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
