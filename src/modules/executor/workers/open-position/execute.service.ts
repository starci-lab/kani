import {
    Injectable
} from "@nestjs/common"
import {
    ExecuteParams,
    ExecuteResult,
    OpenPositionJobData,
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
    OpenPositionActionService,
    PrepareOpenPositionResult,
    ExecuteOpenPositionResult,
} from "@modules/blockchains"
import {
    envConfig 
} from "@modules/env"
import {
    ToStringObject 
} from "@modules/common"
import {
    InjectSuperJson,
    DayjsService
} from "@modules/mixin"
import {
    AsyncService 
} from "@modules/mixin"
import {
    SuperJSON 
} from "superjson"
import {
    AbstractException,
    OpenPositionJobExecutedFailedException,
} from "@modules/exceptions"
import {
    FatalError 
} from "../fatal"
import {
    UnrecoverableError 
} from "bullmq"

@Injectable()
export class ExecuteService {
    constructor(
        private readonly openPositionActionService: OpenPositionActionService,
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
            dynamicLiquidityPoolInfo,
            liquidityPool,
        }: ExecuteParams
    ): Promise<ExecuteResult> {
        const isRetry = bullmqJob.attemptsMade > 0
        // Guard: if job already passed EXECUTED phase, do nothing
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Executed)
        ) {
            const { 
                openPositionTransaction: stringifiedOpenPositionTransaction, 
                executeResult: stringifiedExecuteResult, 
                transactionRecords: stringifiedTransactionRecords 
            } = job.data as ToStringObject<OpenPositionJobData>
            const openPositionTransaction = this.superJson.parse<PrepareOpenPositionResult>(stringifiedOpenPositionTransaction)
            const executeResult = stringifiedExecuteResult ? this.superJson.parse<ExecuteOpenPositionResult>(stringifiedExecuteResult) : undefined
            const transactionRecords = stringifiedTransactionRecords ? this.superJson.parse<Array<AddTransactionRecordParams>>(stringifiedTransactionRecords) : undefined
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
                result: {
                    openPositionTransaction,
                    executeResult,
                    transactionRecords,
                }
            }
        }
        const { openPositionTransaction } = prepareResult
        const stimulate = envConfig().executor.runtime.operation.openPosition.stimulate
        const [executeResult,
            error] = await this.asyncService.resolveTuple(
            this.openPositionActionService.execute(
                {
                    bot,
                    prepareTxs: openPositionTransaction.prepareTxs,
                    state: {
                        static: liquidityPool,
                        dynamic: dynamicLiquidityPoolInfo,
                    },
                    txCheck: isRetry || (payload.isRetry ?? false),
                    stimulate,
                }
            )
        )
        if (error) {
            // create a failed error
            const failedError = new OpenPositionJobExecutedFailedException({
                originalError: error,
                botId: bot.id,
                jobId: job.id,
                liquidityPoolId: liquidityPool.displayId,
            }
            )
            // if the error is throw intentionally, throw a fatal error to stop the job
            if (error instanceof AbstractException) {
                throw new FatalError(failedError.toJSON())
            }
            // if the error is not throw intentionally, throw an unrecoverable error to let BullMQ handle the retry
            throw new UnrecoverableError(failedError.toJSON())
        }
        const txHashes = executeResult.txHashes ?? []
        const transactionRecords: Array<AddTransactionRecordParams> = txHashes.map(
            (txHash) => (
                {
                    bot,
                    txHash,
                    chainId: bot.chainId,
                    type: TransactionType.OpenPosition,
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
                        "data.executeResult": this.superJson.stringify(executeResult),
                        "data.transactionRecords": this.superJson.stringify(transactionRecords),
                    },
                }
            )
        return {
            result: {
                ...prepareResult,
                transactionRecords,
                executeResult,
            }
        }
    }
}

