import {
    Injectable,
} from "@nestjs/common"
import {
    BalanceService,
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
    OpenPositionSnapshotService,
} from "@modules/blockchains"
import {
    BalanceSnapshotsNotFoundException, 
} from "@exceptions"
import BN from "bn.js"
import {
    envConfig 
} from "@modules/env"

@Injectable()
export class ConfirmService {
    constructor(
        private readonly balanceService: BalanceService,
        private readonly transactionSnapshotService: TransactionSnapshotService,
        private readonly balanceSnapshotService: BalanceSnapshotService,
        private readonly openPositionSnapshotService: OpenPositionSnapshotService,
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
            liquidityPool,
            targetToken,
            quoteToken,
            gasToken,
        }: ConfirmParams
    ) {
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Confirmed)
        ) {
            this.winstonService.log(
                WinstonLog.OpenPositionJobAlreadyConfirmed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
            return
        }
        const { transactionRecord, openPositionTransaction, executeResult: _executeResult } = executeResult
        // re-fetch balances post execution
        const {
            targetBalanceAmount,
            quoteBalanceAmount,
            gasBalanceAmount,
        } = await this.balanceService.fetchBalances({
            bot 
        })
        const session = await this.connection.startSession()
        try {
            await session.withTransaction(
                async () => {
                    if (!bot.balanceSnapshots) {
                        throw new BalanceSnapshotsNotFoundException(
                            {
                                botId: bot.id,
                            }
                        )
                    }
                    if (transactionRecord) {
                        await this.transactionSnapshotService.addTransactionRecord(
                            {
                                ...transactionRecord,
                                session,
                            }
                        )
                    }
                    await this.balanceSnapshotService.updateBotSnapshotBalancesRecord(
                        {
                            bot,
                            targetBalanceAmount,
                            quoteBalanceAmount,
                            gasBalanceAmount,
                            session,
                        }
                    )
                    await this.openPositionSnapshotService.addOpenPositionRecord(
                        {
                            bot,
                            before: {
                                targetBalanceAmount: new BN(bot.balanceSnapshots.targetBalanceAmount),
                                quoteBalanceAmount: new BN(bot.balanceSnapshots.quoteBalanceAmount),
                                gasBalanceAmount: new BN(bot.balanceSnapshots.gasBalanceAmount),
                            },
                            after: {
                                targetBalanceAmount,
                                quoteBalanceAmount,
                                gasBalanceAmount,
                            },
                            openTxHash: openPositionTransaction.txHash,
                            positionId: _executeResult?.positionId ?? "",
                            feeAmountQuote: openPositionTransaction.feeAmountA,
                            feeAmountTarget: openPositionTransaction.feeAmountB,
                            liquidityPool,
                            targetToken,
                            quoteToken,
                            gasToken,
                            session,
                            stimulate: envConfig().executor.runtime.operation.openPosition.stimulate,
                        }
                    )

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


