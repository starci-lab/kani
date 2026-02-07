import {
    Injectable
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
    TransactionType,
} from "@modules/databases"
import {
    Connection
} from "mongoose"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"
import {
    AddTransactionRecordParams,
    ClosePositionActionService,
    PrepareClosePositionResult,
} from "@modules/blockchains"
import {
    envConfig 
} from "@modules/env"
import {
    ToStringObject 
} from "@modules/common"
import {
    InjectSuperJson,
    DayjsService,
    AsyncService,
} from "@modules/mixin"
import {
    SuperJSON 
} from "superjson"
import {
    AbstractException,
    ClosePositionJobExecutedFailedException,
} from "@modules/exceptions"
import {
    FatalError,
} from "../fatal"
import {
    UnrecoverableError,
} from "bullmq"

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
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly dayjsService: DayjsService,
        private readonly asyncService: AsyncService,
    ) {}

    /**
     * EXECUTE phase.
     *
     * Executes prepared close-position transactions and persists a state transition:
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
            dynamicLiquidityPoolInfo,
            liquidityPool,
        }: ExecuteParams
    ): Promise<ExecuteResult> {
        const isRetry = bullmqJob.attemptsMade > 0
        // Guard: if job already passed EXECUTED phase, do nothing
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Executed)
        ) {
            const { closePositionTransaction: stringifiedClosePositionTransaction, transactionRecords: stringifiedTransactionRecords } = job.data as ToStringObject<ClosePositionJobData>
            const closePositionTransaction = this.superJson.parse<PrepareClosePositionResult>(stringifiedClosePositionTransaction)
            const transactionRecords = stringifiedTransactionRecords ? this.superJson.parse<Array<AddTransactionRecordParams>>(stringifiedTransactionRecords) : undefined
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
                result: {
                    closePositionTransaction,
                    transactionRecords,
                }
            }
        }
        const { closePositionTransaction } = prepareResult
        const [executeResult,
            error] = await this.asyncService.resolveTuple(
            this.closePositionActionService.execute(
                {
                    bot,
                    prepareTxs: closePositionTransaction.prepareTxs,
                    state: {
                        static: liquidityPool,
                        dynamic: dynamicLiquidityPoolInfo,
                    },
                    txCheck: isRetry || (payload.isRetry ?? false),
                    stimulate: envConfig().executor.runtime.operation.closePosition.stimulate,
                }
            ),
        )
        if (error) {
            const failedError = new ClosePositionJobExecutedFailedException({
                originalError: error,
                botId: bot.id,
                jobId: job.id,
                liquidityPoolId: liquidityPool.displayId,
            })
            if (error instanceof AbstractException) {
                throw new FatalError(failedError.toJSON())
            }
            throw new UnrecoverableError(failedError.toJSON())
        }
        const txHashes = executeResult.txHashes ?? closePositionTransaction.prepareTxs.map((tx) => tx.txHash)
        const transactionRecords: Array<AddTransactionRecordParams> = txHashes.map(
            (txHash) => (
                {
                    bot,
                    txHash,
                    chainId: bot.chainId,
                    type: TransactionType.ClosePosition,
                }
            ),
        )

        await this.connection
            .model<JobSchema>(JobSchema.name)
            .updateOne(
                {
                    _id: job.id
                },
                {
                    $set: {
                        status: JobStatus.Executed,
                        "data.transactionRecords": this.superJson.stringify(transactionRecords),
                    },
                }
            )
        return {
            result: {
                ...prepareResult,
                transactionRecords,
            }
        }
    }
}

