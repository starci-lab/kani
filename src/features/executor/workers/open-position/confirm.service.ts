import {
    Injectable,
} from "@nestjs/common"
import {
    AddTransactionRecordParams,
    BalanceFetcherService,
    BalanceSnapshotService,
    TransactionSnapshotService,
} from "@modules/blockchains"
import {
    getJobStatusOrder,
    InjectPrimaryMongoose,
    JobSchema,
    JobStatus,
    LiquidityPoolType,
    TransactionType,
} from "@modules/databases"
import {
    Connection,
} from "mongoose"
import type {
    ConfirmParams,
    ConfirmResult,
} from "./types"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"
import {
    OpenPositionActionService,
    OpenPositionSnapshotService,
} from "@modules/blockchains"
import {
    BalanceSnapshotsNotFoundException, 
} from "@modules/exceptions"
import BN from "bn.js"
import {
    envConfig 
} from "@modules/env"
import {
    DayjsService 
} from "@modules/mixin"
import {
    SendHeartbeatService,
} from "../common"

/**
 * Service for the CONFIRM phase of open-position jobs.
 *
 * @example
 * await confirmService.process(params)
 */
@Injectable()
export class ConfirmService {
    constructor(
        private readonly balanceFetcherService: BalanceFetcherService,
        private readonly transactionSnapshotService: TransactionSnapshotService,
        private readonly balanceSnapshotService: BalanceSnapshotService,
        private readonly openPositionSnapshotService: OpenPositionSnapshotService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
        private readonly openPositionActionService: OpenPositionActionService,
        private readonly dayjsService: DayjsService,
        private readonly sendHeartbeatService: SendHeartbeatService,
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
        params: ConfirmParams
    ): Promise<ConfirmResult> {
        // HEARTBEAT phase
        await this.sendHeartbeatService.process(params)
        // CONFIRM phase
        const { job, bot, executeResult, liquidityPool, targetToken, quoteToken, gasToken, state } = params
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Confirmed)
        ) {
            this.winstonService.log(
                WinstonLog.OpenPositionJobAlreadyConfirmed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    liquidityPoolId: liquidityPool.displayId,
                    ageMs: this.dayjsService.now().diff(job.createdAt,
                        "millisecond"),
                }
            )
            return
        }
        if (!envConfig().executor.runtime.operation.openPosition.stimulate) {
            const positionId = executeResult?.data?.executeResult?.positionId ?? ""
            // confirm the position
            const { liquidity } = await this.openPositionActionService.confirm({
                positionId,
                state,
                liquidityPool,
                bot,
            })
            // re-fetch balances post execution
            const {
                targetBalanceAmount,
                quoteBalanceAmount,
                gasBalanceAmount,
            } = await this.balanceFetcherService.fetchBalances({
                bot 
            })
            const targetIsA = liquidityPool.tokenA.toString() === targetToken.id.toString()
            const session = await this.connection.startSession()
            await session.withTransaction(
                async () => {
                    if (envConfig().executor.runtime.operation.openPosition.stimulate) {
                        return
                    }
                    if (!bot.balanceSnapshots) {
                        throw new BalanceSnapshotsNotFoundException(
                            {
                                botId: bot.id,
                            }
                        )
                    }
                    if (executeResult?.data?.executeResult?.txHashes?.length) {
                        for (const txHash of executeResult?.data?.executeResult?.txHashes ?? []) {
                            const params: AddTransactionRecordParams = {
                                bot,
                                txHash,
                                chainId: liquidityPool.chainId,
                                type: TransactionType.OpenPosition,
                                session,
                            }
                            await this.transactionSnapshotService.addTransactionRecord(
                                params
                            )
                        }
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
                            liquidityPool,
                            feeTargetAmount: targetIsA ? executeResult?.data?.prepareResult?.feeAmountA ?? new BN(0) : executeResult?.data?.prepareResult?.feeAmountB ?? new BN(0),
                            feeQuoteAmount: targetIsA ? executeResult?.data?.prepareResult?.feeAmountB ?? new BN(0) : executeResult?.data?.prepareResult?.feeAmountA ?? new BN(0),
                            targetToken,
                            quoteToken,
                            gasToken,
                            positionId: positionId ?? "",
                            openTxHashes: executeResult?.data?.executeResult?.txHashes ?? [],
                            clmmParams: liquidityPool.type === LiquidityPoolType.Clmm ? {
                                liquidity: liquidity ?? new BN(0),
                                tickLower: executeResult?.data?.prepareResult?.tickLower ?? new BN(0),
                                tickUpper: executeResult?.data?.prepareResult?.tickUpper ?? new BN(0),
                            } : undefined,
                            dlmmParams: liquidityPool.type === LiquidityPoolType.Dlmm ? {
                                minBinId: executeResult?.data?.prepareResult?.minBinId ?? new BN(0),
                                maxBinId: executeResult?.data?.prepareResult?.maxBinId ?? new BN(0),
                            } : undefined,
                            metadata: executeResult?.data?.prepareResult?.metadata,
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
                                },
                            },
                            {
                                session,
                            }
                        )
                }
            )
        }
        this.winstonService.log(
            WinstonLog.OpenPositionJobConfirmed,
            {
                botId: bot.id,
                liquidityPoolId: liquidityPool.displayId,
                jobId: job.id,
            }
        )
    }
}


