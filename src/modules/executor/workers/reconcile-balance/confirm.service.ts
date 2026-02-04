import {
    Injectable,
} from "@nestjs/common"
import {
    BalanceFetcherService,
    BalanceSnapshotService,
    TransactionSnapshotService,
} from "@modules/blockchains"
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
    ConfirmParams,
} from "./types"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"
import {
    envConfig
} from "@modules/env"

@Injectable()
export class ConfirmService {
    constructor(
        private readonly balanceFetcherService: BalanceFetcherService,
        private readonly transactionSnapshotService: TransactionSnapshotService,
        private readonly balanceSnapshotService: BalanceSnapshotService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
    ) {}

    /**
     * CONFIRM phase.
     *
     * Post-transaction bookkeeping after swaps have been executed:
     * - re-fetch balances from chain
     * - persist transaction snapshot records (if any)
     * - persist updated bot balance snapshot
     * - transition job status to CONFIRMED
     *
     * Idempotency: if the job is already at/after CONFIRMED, returns early.
     */
    async process(
        {
            bot,
            job,
            executeResult,
        }: ConfirmParams
    ) {
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Confirmed)
        ) {
            this.winstonService.log(
                WinstonLog.ReconcileBalanceJobAlreadyConfirmed,
                {
                    botId: bot.id,
                    jobId: job.id,
                }
            )
            return
        }
        const { transactionRecords } = executeResult
        // re-fetch balances post execution
        const {
            targetBalanceAmount,
            quoteBalanceAmount,
            gasBalanceAmount,
        } = await this.balanceFetcherService.fetchBalances({
            bot 
        })

        const session = await this.connection.startSession()
        try {
            await session.withTransaction(
                async () => {
                    // no update when stimulate is enabled
                    if (envConfig().executor.runtime.operation.reconcileBalance.stimulate) {
                        return
                    }
                    for (const transactionRecord of transactionRecords || []) {
                        await this.transactionSnapshotService.addTransactionRecord(
                            {
                                ...transactionRecord,
                                session,
                            }
                        )
                    }
                    // update the bot snapshot balances
                    await this.balanceSnapshotService.updateBotSnapshotBalancesRecord(
                        {
                            bot,
                            targetBalanceAmount,
                            quoteBalanceAmount,
                            gasBalanceAmount,
                            session,
                        }
                    )
                    // update the job status to CONFIRMED
                    await this.connection
                        .model<JobSchema>(JobSchema.name)
                        .updateOne(
                            {
                                _id: job.id,
                            },
                            {
                                $set: {
                                    status: JobStatus.Confirmed,
                                },
                            },
                            {
                                session,
                            }
                        )
                }
            )
        } finally {
            await session.endSession()
        }
    }
}


