import {
    Injectable,
} from "@nestjs/common"
import type {
    ExecuteParams,
    ExecuteResult,
    ReconcileBalanceJobData,
} from "./types"
import {
    BalanceActionService,
} from "@modules/blockchains/balance"
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
    envConfig,
} from "@modules/env"
import {
    DayjsService,
    AsyncService,
} from "@modules/mixin"
import {
    TransactionSubmitFailedException,
    ExecuteReconcileBalanceTransactionResultNotFoundException,
    JobFailureException,
    JobFailureStrategy,
} from "@modules/exceptions"
import {
    ToStringObject,
} from "@modules/common"
import {
    SerializerService,
    SendHeartbeatService,
} from "../common"

/**
 * Service for the EXECUTE phase of reconcile-balance jobs.
 *
 * @example
 * const result = await executeService.process(params)
 */
@Injectable()
export class ExecuteService {
    constructor(
        private readonly balanceActionService: BalanceActionService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
        private readonly dayjsService: DayjsService,
        private readonly asyncService: AsyncService,
        private readonly serializerService: SerializerService,
        private readonly sendHeartbeatService: SendHeartbeatService,
    ) {}

    /**
     * EXECUTE phase: executes prepared swaps, persists PREPARED → EXECUTED.
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
        // HEARTBEAT phase
        await this.sendHeartbeatService.process({
            ...params,
            fatal: true,
        })
        // EXECUTE phase
        const { job, bot, bullmqJob, prepareResult, payload } = params
        const isRetry = bullmqJob.attemptsMade > 0
        // guard: idempotency (return persisted data if already executed)
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Executed)
        ) {
            const jobData = this.serializerService.deserialize<ReconcileBalanceJobData>(
                job.data as Partial<ToStringObject<ReconcileBalanceJobData>>
            )
            this.winstonService.log(
                WinstonLog.ReconcileBalanceJobAlreadyExecuted,
                {
                    botId: bot.id,
                    jobId: job.id,
                    ageMs: this.dayjsService.now().diff(job.createdAt,
                        "millisecond"),
                }
            )
            return {
                data: jobData,
            }
        }

        const prepareTxs = prepareResult?.data?.prepareResult?.prepareTxs ?? []
        const [
            executeResult, 
            error,
        ] = await this.asyncService.resolveTuple(
            this.balanceActionService.executeReconcileBalanceTransaction(
                {
                    bot,
                    prepareTxs: prepareTxs ?? [],
                    isRetry: isRetry || (payload.isRetry ?? false),
                    stimulate: envConfig().executor.runtime.operation.reconcileBalance.stimulate,
                }
            ),
        )
        if (error) {
            if ((error instanceof TransactionSubmitFailedException) && isRetry) {
                throw new JobFailureException({
                    strategy: JobFailureStrategy.Fatal,
                    originalError: error,
                })
            }
            throw new JobFailureException({
                strategy: JobFailureStrategy.Requeue,
                originalError: error,
            })
        }
        if (!executeResult) {
            throw new ExecuteReconcileBalanceTransactionResultNotFoundException({
                botId: bot.id,
                jobId: job.id,
            })
        }
        const data = this.serializerService.serialize<Partial<ReconcileBalanceJobData>>({
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
        return {
            data: {
                prepareResult: prepareResult?.data?.prepareResult,
                executeResult,
            }
        }
    }
}
