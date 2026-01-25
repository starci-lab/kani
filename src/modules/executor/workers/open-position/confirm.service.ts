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
    LiquidityPoolType,
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
    OpenPositionOrchestratorService,
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
        private readonly openPositionOrchestratorService: OpenPositionOrchestratorService,
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
            dynamicLiquidityPoolInfo
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
        // confirm the position
        const { liquidity } = await this.openPositionOrchestratorService.confirm({
            positionId: _executeResult?.positionId ?? "",
            state: {
                static: liquidityPool,
                dynamic: dynamicLiquidityPoolInfo,
            },
            bot,
        })
        // re-fetch balances post execution
        const {
            targetBalanceAmount,
            quoteBalanceAmount,
            gasBalanceAmount,
        } = await this.balanceService.fetchBalances({
            bot 
        })
        const targetIsA = liquidityPool.tokenA.toString() === targetToken.id.toString()
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
                    console.log(liquidityPool.type === LiquidityPoolType.Clmm ? {
                        liquidity: liquidity ?? new BN(0),
                        tickLower: openPositionTransaction.tickLower ?? new BN(0),
                        tickUpper: openPositionTransaction.tickUpper ?? new BN(0),
                    } : undefined)
                    console.log(liquidityPool.type === LiquidityPoolType.Dlmm ? {
                        minBinId: openPositionTransaction?.minBinId ?? new BN(0),
                        maxBinId: openPositionTransaction?.maxBinId ?? new BN(0),
                    } : undefined)
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
                            feeTargetAmount: targetIsA ? openPositionTransaction.feeAmountA : openPositionTransaction.feeAmountB,
                            feeQuoteAmount: targetIsA ? openPositionTransaction.feeAmountB : openPositionTransaction.feeAmountA,
                            liquidityPool,
                            targetToken,
                            quoteToken,
                            gasToken,
                            session,
                            stimulate: envConfig().executor.runtime.operation.openPosition.stimulate,
                            clmmParams: liquidityPool.type === LiquidityPoolType.Clmm ? {
                                liquidity: liquidity ?? new BN(0),
                                tickLower: openPositionTransaction.tickLower ?? new BN(0),
                                tickUpper: openPositionTransaction.tickUpper ?? new BN(0),
                            } : undefined,
                            dlmmParams: liquidityPool.type === LiquidityPoolType.Dlmm ? {
                                minBinId: openPositionTransaction?.minBinId ?? new BN(0),
                                maxBinId: openPositionTransaction?.maxBinId ?? new BN(0),
                            } : undefined,
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


