import {
    Injectable
} from "@nestjs/common"
import type {
    ExecuteParams,
    ExecuteResult,
    OpenPositionJobData,
} from "./types"
import {
    getJobStatusOrder,
    InjectPrimaryMongoose,
    JobSchema,
    JobStatus,
} from "@modules/databases"
import {
    Connection
} from "mongoose"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"
import {
    OpenPositionActionService,
} from "@modules/blockchains"
import {
    envConfig 
} from "@modules/env"
import {
    ToStringObject 
} from "@modules/common"
import {
    DayjsService
} from "@modules/mixin"
import {
    AsyncService 
} from "@modules/mixin"
import {
    AbstractException,
    ExecuteOpenPositionResultNotFoundException,
    JobFailureException,
    JobFailureStrategy,
} from "@modules/exceptions"
import {
    SerializerService 
} from "../common"

/**
 * Service for the EXECUTE phase of open-position jobs.
 *
 * @example
 * const result = await executeService.process(params)
 */
@Injectable()
export class ExecuteService {
    constructor(
        private readonly openPositionActionService: OpenPositionActionService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
        private readonly dayjsService: DayjsService,
        private readonly asyncService: AsyncService,
        private readonly serializerService: SerializerService,
    ) {}

    /**
     * EXECUTE phase.
     *
     * Executes prepared swap transactions and persists a state transition:
     * PREPARED → EXECUTED. Also returns `transactionRecords` for the CONFIRM phase.
     *
     * Idempotency: if the job is already at/after EXECUTED, returns the existing metadata.
     */
    async process(
        {
            job,
            bot,
            bullmqJob,
            prepareResult,
            payload,
            state,
            liquidityPool,
        }: ExecuteParams
    ): Promise<ExecuteResult> {
        const isRetry = bullmqJob.attemptsMade > 0
        // Guard: if job already passed EXECUTED phase, do nothing
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Executed)
        ) {
            const jobData = this.serializerService.deserialize<OpenPositionJobData>(
                job.data as Partial<ToStringObject<OpenPositionJobData>>
            )
            this.winstonService.log(
                WinstonLog.OpenPositionJobAlreadyExecuted,
                {
                    botId: bot.id,
                    jobId: job.id,
                    liquidityPoolId: liquidityPool.displayId,
                    ageMs: this.dayjsService.now().diff(job.createdAt,
                        "millisecond"),
                }
            )
            return {
                data: jobData,
            }
        }
        const stimulate = envConfig().executor.runtime.operation.openPosition.stimulate
        const [executeResult,
            error] = await this.asyncService.resolveTuple(
            this.openPositionActionService.execute(
                {
                    bot,
                    prepareTxs: prepareResult?.data?.prepareResult?.prepareTxs ?? [],
                    state,
                    liquidityPool,
                    txCheck: isRetry || (payload.isRetry ?? false),
                    stimulate,
                }
            )
        )
        if (error) {
            // if the error is throw intentionally, throw a fatal error to let BullMQ handle the retry
            if (error instanceof AbstractException) {
                throw new JobFailureException({
                    strategy: JobFailureStrategy.Fatal,
                    originalError: error,
                })
            }
            // if the error is not throw intentionally, throw a requeue error to let BullMQ handle the retry
            throw new JobFailureException({
                strategy: JobFailureStrategy.Requeue,
                originalError: error,
            })
        }
        if (!executeResult) {
            throw new ExecuteOpenPositionResultNotFoundException(
                {
                    botId: bot.id,
                    jobId: job.id,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
        }
        const data = this.serializerService.serialize<Partial<OpenPositionJobData>>({
            executeResult,
        })
        await this.connection
            .model<JobSchema>(JobSchema.name)
            .updateOne(
                {
                    _id: job.id
                },
                {
                    $set: {
                        status: JobStatus.Executed,
                        ...data,
                    },
                }
            )
        return {
            data: {
                prepareResult: prepareResult?.data?.prepareResult,
                executeResult,
            },
        }
    }
}

