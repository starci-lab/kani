import {
    Injectable
} from "@nestjs/common"
import {
    ExecuteParams,
    ExecuteResult,
    WithdrawJobData
} from "./types"
import {
    AddTransactionRecordParams,
    BalanceActionService,
    PrepareWithdrawTransactionResult
} from "@modules/blockchains"
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
    envConfig 
} from "@modules/env"
import {
    DayjsService,
    InjectSuperJson,
    AsyncService,
} from "@modules/mixin"
import {
    SuperJSON 
} from "superjson"
import {
    ToStringObject 
} from "@modules/common"
import {
    AbstractException,
    WithdrawJobExecutedFailedException,
} from "@modules/exceptions"
import {
    FatalError,
} from "../fatal"
import {
    UnrecoverableError,
} from "bullmq"

@Injectable()
export class ExecuteService {
    constructor(
        private readonly balanceActionService: BalanceActionService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
        private readonly dayjsService: DayjsService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
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
        }: ExecuteParams
    ): Promise<ExecuteResult> {
        const isRetry = bullmqJob.attemptsMade > 0
        // Guard: if job already passed EXECUTED phase, do nothing
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Executed)
        ) {
            const { 
                withdrawTransaction: stringifiedWithdrawTransaction, 
                transactionRecords: stringifiedTransactionRecords 
            } = job.data as ToStringObject<WithdrawJobData>
            const withdrawTransaction = this.superJson.parse<PrepareWithdrawTransactionResult>(stringifiedWithdrawTransaction)
            const transactionRecords = stringifiedTransactionRecords ? this.superJson.parse<Array<AddTransactionRecordParams>>(stringifiedTransactionRecords) : undefined
            this.winstonService.log(
                WinstonLog.WithdrawJobAlreadyExecuted,
                {
                    botId: bot.id,
                    jobId: job.id,
                    ageMs: this.dayjsService.now().diff(job.createdAt,
                        "millisecond"),
                }
            )
            return {
                result: {
                    withdrawTransaction,
                    transactionRecords,
                }
            }
        }

        const transactionRecords: Array<AddTransactionRecordParams> = []
        const { withdrawTransaction } = prepareResult

        const [executeResult,
            error] = await this.asyncService.resolveTuple(
            this.balanceActionService.executeWithdrawTransaction(
                {
                    bot,
                    prepareTxs: withdrawTransaction.prepareTxs,
                    isRetry: isRetry || (payload.isRetry ?? false),
                    stimulate: envConfig().executor.runtime.operation.withdraw.stimulate,
                }
            )
        )
        if (error) {
            const failedError = new WithdrawJobExecutedFailedException({
                originalError: error,
                botId: bot.id,
                jobId: job.id,
            })
            if (error instanceof AbstractException) {
                throw new FatalError(failedError.toJSON())
            }
            throw new UnrecoverableError(failedError.toJSON())
        }

        const txHashes = executeResult?.txHashes ?? []
        for (const txHash of txHashes) {
            transactionRecords.push(
                {
                    bot,
                    txHash,
                    chainId: bot.chainId,
                    type: TransactionType.Withdraw,
                }
            )
        }
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

