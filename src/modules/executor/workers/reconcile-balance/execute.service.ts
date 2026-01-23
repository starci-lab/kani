import {
    Injectable
} from "@nestjs/common"
import {
    ExecuteParams,
    ExecuteResult,
    ReconcileBalanceJobMetadata,
} from "./types"
import {
    BalanceService
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

@Injectable()
export class ExecuteService {
    constructor(
        private readonly balanceService: BalanceService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
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
        }: ExecuteParams
    ): Promise<ExecuteResult> {
        const isRetry = bullmqJob.attemptsMade > 0

        // Guard: if job already passed EXECUTED phase, do nothing
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Executed)
        ) {
            return {
                result: job.metadata as ReconcileBalanceJobMetadata
            }
        }

        const transactionRecords: ReconcileBalanceJobMetadata["transactionRecords"] = []
        const { swapTransactions } = prepareResult

        for (const swapTransaction of swapTransactions) {
            await this.balanceService.executeSwapTransaction(
                {
                    bot,
                    txHash: swapTransaction.txHash,
                    signatureWithBytes: swapTransaction.signatureWithBytes,
                    // only check the transaction if it is a retry
                    txCheck: isRetry,
                    stimulate: true,
                }
            )

            transactionRecords.push(
                {
                    bot,
                    txHash: swapTransaction.txHash,
                    chainId: bot.chainId,
                    type: TransactionType.Swap,
                    isStimulated: true,
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

