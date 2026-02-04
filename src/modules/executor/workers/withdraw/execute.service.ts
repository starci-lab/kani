import {
    Injectable
} from "@nestjs/common"
import {
    ExecuteParams,
    ExecuteResult,
    ReconcileBalanceJobData
} from "./types"
import {
    BalanceActionService
} from "@modules/blockchains/balance"
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

@Injectable()
export class ExecuteService {
    constructor(
        private readonly balanceActionService: BalanceActionService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
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
            this.winstonService.log(
                WinstonLog.WithdrawJobAlreadyExecuted,
                {
                    botId: bot.id,
                    jobId: job.id,
                }
            )
            return {
                result: job.data as ReconcileBalanceJobData
            }
        }

        const transactionRecords: ReconcileBalanceJobData["transactionRecords"] = []
        const { prepareTxs } = prepareResult

        const { txHashes } = await this.balanceActionService.executeWithdrawTransaction({
            bot,
            prepareTxs,
            isRetry: isRetry || (payload.isRetry ?? false),
            stimulate: envConfig().executor.runtime.operation.withdraw.stimulate,
        })

        for (const txHash of txHashes) {
            transactionRecords.push(
                {
                    bot,
                    txHash,
                    chainId: bot.chainId,
                    type: TransactionType.Swap,
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

