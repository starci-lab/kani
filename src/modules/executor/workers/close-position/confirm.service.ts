import {
    Injectable,
} from "@nestjs/common"
import {
    BalanceService,
    BalanceSnapshotService,
    TransactionSnapshotService,
} from "@modules/blockchains"
import {
    BotSchema,
    getJobStatusOrder,
    InjectPrimaryMongoose,
    JobSchema,
    JobStatus,
    PositionSchema,
} from "@modules/databases"
import {
    Connection,
} from "mongoose"
import {
    ConfirmParams,
} from "./types"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"
import {
    ActivePositionNotFoundException,
} from "@modules/exceptions"
import {
    envConfig,
} from "@modules/env"

@Injectable()
export class ConfirmService {
    constructor(
        private readonly balanceService: BalanceService,
        private readonly transactionSnapshotService: TransactionSnapshotService,
        private readonly balanceSnapshotService: BalanceSnapshotService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
    ) {}

    /**
     * CONFIRM phase.
     *
     * Post-transaction bookkeeping after close-position tx execution:
     * - re-fetch balances from chain
     * - persist transaction record snapshot
     * - persist updated bot balance snapshot
     * - mark the active Position as closed (closeTxHash + isActive=false)
     * - clear bot.activePosition
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
        }: ConfirmParams
    ) {
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Confirmed)
        ) {
            this.winstonService.log(
                WinstonLog.ClosePositionJobAlreadyConfirmed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
            return
        }

        if (!bot.activePosition?.position) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }

        const { transactionRecord, closePositionTransaction } = executeResult

        const {
            targetBalanceAmount,
            quoteBalanceAmount,
            gasBalanceAmount,
        } = await this.balanceService.fetchBalances(
            {
                bot,
            }
        )

        const session = await this.connection.startSession()
        try {
            await session.withTransaction(
                async () => {
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

                    // Mark position as closed.
                    await this.connection.model<PositionSchema>(PositionSchema.name).updateOne(
                        {
                            _id: bot.activePosition!.position,
                        },
                        {
                            $set: {
                                closeTxHash: closePositionTransaction.txHash,
                                isActive: false,
                            },
                        },
                        {
                            session,
                        }
                    )

                    // Clear bot.activePosition so subsequent reconcile-balance can run.
                    await this.connection.model<BotSchema>(BotSchema.name).updateOne(
                        {
                            _id: bot.id,
                        },
                        {
                            $unset: {
                                activePosition: null,
                            },
                        },
                        {
                            session,
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
                                    "metadata.isStimulated": envConfig().executor.runtime.operation.closePosition.stimulate,
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