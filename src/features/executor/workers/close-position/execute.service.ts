import {
    Injectable,
} from "@nestjs/common"
import type {
    ExecuteParams,
    ExecuteResult,
    ClosePositionJobData,
} from "./types"
import {
    getJobStatusOrder,
    InjectPrimaryMongoose,
    JobSchema,
    JobStatus,
} from "@modules/databases"
import {
    Connection,
} from "mongoose"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"
import {
    ClosePositionActionService,
} from "@modules/blockchains"
import {
    envConfig,
} from "@modules/env"
import {
    ToStringObject,
} from "@modules/common"
import {
    DayjsService,
    AsyncService,
} from "@modules/mixin"
import {
    ExecuteClosePositionResultNotFoundException,
    JobFailureException,
    JobFailureStrategy,
} from "@modules/exceptions"
import {
    SerializerService,
    SendHeartbeatService,
} from "../common"

/**
 * Service for the EXECUTE phase of close-position jobs.
 *
 * @example
 * const result = await executeService.process(params)
 */
@Injectable()
export class ExecuteService {
    constructor(
        private readonly closePositionActionService: ClosePositionActionService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
        private readonly dayjsService: DayjsService,
        private readonly asyncService: AsyncService,
        private readonly serializerService: SerializerService,
        private readonly sendHeartbeatService: SendHeartbeatService,
    ) {}

    /**
     * EXECUTE phase: executes prepared close-position transactions, persists PREPARED → EXECUTED.
     *
     * @param params - Execute params (job, bot, prepareResult, payload, ...)
     * @returns Execute result with executeResult data
     *
     * @example
     * const result = await executeService.process(params)
     */
    async process(
        params: ExecuteParams
    ): Promise<ExecuteResult> {
        const { job, bot, bullmqJob, prepareResult, payload, state, liquidityPool } = params
        const isRetry = bullmqJob.attemptsMade > 0
        // guard: idempotency (return persisted data if already executed)
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Executed)
        ) {
            const jobData = this.serializerService.deserialize<ClosePositionJobData>(
                job.data as Partial<ToStringObject<ClosePositionJobData>>
            )
            this.winstonService.log(
                WinstonLog.ClosePositionJobAlreadyExecuted,
                {
                    botId: bot.id,
                    jobId: job.id,
                    liquidityPoolId: liquidityPool.displayId,
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
        const prepareTxs = prepareResult?.data.prepareResult?.prepareTxs ?? []
        const [
            executeResult,
            error,
        ] = await this.asyncService.resolveTuple(
            this.closePositionActionService.execute(
                {
                    bot,
                    prepareTxs,
                    liquidityPool,
                    state,
                    txCheck: isRetry || (payload.isRetry ?? false),
                    stimulate: envConfig().executor.runtime.operation.closePosition.stimulate,
                }
            )
        )
        if (error) {
            throw new JobFailureException({
                strategy: JobFailureStrategy.Requeue,
                originalError: error,
            })
        }
        if (!executeResult) {
            throw new ExecuteClosePositionResultNotFoundException({
                botId: bot.id,
                jobId: job.id,
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        const data = this.serializerService.serialize<Partial<ClosePositionJobData>>({
            executeResult,
        })
        await this.connection.model<JobSchema>(JobSchema.name).updateOne(
            {
                _id: {
                    $eq: job._id,
                },
            },
            {
                $set: {
                    status: JobStatus.Executed,
                    ...data,
                },
            }
        )
        await this.sendHeartbeatService.process(params)
        return {
            data: {
                prepareResult: prepareResult?.data.prepareResult,
                executeResult,
            },
        }
    }
}
