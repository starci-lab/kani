import {
    Injectable,
} from "@nestjs/common"
import {
    BalanceFetcherService,
    BalanceService,
    BalanceSnapshotService,
    ClosePositionSnapshotService,
    TransactionSnapshotService,
} from "@modules/blockchains"
import {
    BotSchema,
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
    WinstonService,
} from "@modules/winston"
import {
    ActivePositionNotFoundException,
    BalanceSnapshotsNotFoundException,
} from "@modules/exceptions"
import {
    envConfig,
} from "@modules/env"
import BN from "bn.js"

@Injectable()
export class ConfirmService {
    constructor(
        private readonly balanceService: BalanceService,
        private readonly balanceFetcherService: BalanceFetcherService,
        private readonly transactionSnapshotService: TransactionSnapshotService,
        private readonly balanceSnapshotService: BalanceSnapshotService,
        private readonly closePositionSnapshotService: ClosePositionSnapshotService,
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
            targetToken,
            quoteToken,
            gasToken,
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
        if (!bot.activePosition?.position || !bot.activePosition?.associatedPosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        if (!bot.balanceSnapshots) {
            throw new BalanceSnapshotsNotFoundException({
                botId: bot.id,
            })
        }
        const { transactionRecord } = executeResult
        const {
            targetBalanceAmount,
            quoteBalanceAmount,
            gasBalanceAmount,
        } = await this.balanceFetcherService.fetchBalances(
            {
                bot,
            }
        )
        const stimulate = envConfig().executor.runtime.operation.closePosition.stimulate
        const session = await this.connection.startSession()
        await session.withTransaction(
            async (session) => {
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
                // only update bot only if the operation is not stimulated
                if (!stimulate) {
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
                }
                await this.closePositionSnapshotService.updateClosePositionRecord(
                    {
                        before: {
                            targetBalanceAmount: new BN(bot.balanceSnapshots?.targetBalanceAmount ?? 0),
                            quoteBalanceAmount: new BN(bot.balanceSnapshots?.quoteBalanceAmount ?? 0),
                            gasBalanceAmount: new BN(bot.balanceSnapshots?.gasBalanceAmount ?? 0),
                        },
                        after: {
                            targetBalanceAmount,
                            quoteBalanceAmount,
                            gasBalanceAmount,
                        },
                        positionId: bot.activePosition?.associatedPosition?.id ?? "",
                        closeTxHash: transactionRecord?.txHash ?? "",
                        targetToken,
                        quoteToken,
                        gasToken,
                        session,
                        stimulate,
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
    }
}