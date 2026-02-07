import {
    Injectable,
} from "@nestjs/common"
import {
    BalanceFetcherService,
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
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    Connection,
} from "mongoose"
import type {
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
import { 
    LiquidityPoolStateService 
} from "@modules/blockchains"
import _ from "lodash"
import {
    DynamicClmmRewardInfo, DynamicDlmmRewardInfo 
} from "@modules/cache"
import {
    DayjsService 
} from "@modules/mixin"

/**
 * Service for the CONFIRM phase of close-position jobs.
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
        private readonly closePositionSnapshotService: ClosePositionSnapshotService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly dayjsService: DayjsService,
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
                    ageMs: this.dayjsService.now().diff(
                        job.createdAt,
                        "millisecond",
                    ),
                }
            )
            return
        }
        if (!envConfig().executor.runtime.operation.closePosition.stimulate) {
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
        
            const { transactionRecords } = executeResult
            // Fetch dynamic pool from cache
            const dynamicLiquidityPoolInfo = await this.liquidityPoolStateService.getDynamicLiquidityPoolInfo(liquidityPool)
            // Extract reward token addresses
            const rewardTokenAddresses = dynamicLiquidityPoolInfo.rewards.map((reward: DynamicClmmRewardInfo | DynamicDlmmRewardInfo) => reward.tokenAddress)
            // Get reward tokens that are NOT target or quote token
            const nonPairRewardTokenAddresses = _.difference(
                rewardTokenAddresses,
                [targetToken.tokenAddress,
                    quoteToken.tokenAddress]
            )
            const nonPairRewardTokens = this.primaryMemoryStorageService.tokenCollection.find(
                {
                    tokenAddress: {
                        $in: nonPairRewardTokenAddresses,
                    },
                }
            )
            const {
                targetBalanceAmount,
                quoteBalanceAmount,
                gasBalanceAmount,
                incentiveBalanceAmounts,
            } = await this.balanceFetcherService.fetchBalances(
                {
                    bot,
                    incentiveTokens: nonPairRewardTokens,
                }
            )
            const stimulate = envConfig().executor.runtime.operation.closePosition.stimulate
            const session = await this.connection.startSession()
            await session.withTransaction(
                async (session) => {
                    if (transactionRecords?.length) {
                        for (const record of transactionRecords) {
                            await this.transactionSnapshotService.addTransactionRecord(
                                {
                                    ...record,
                                    session,
                                },
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
                            incentiveBalanceAmounts,
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
                                incentiveBalanceAmounts: bot.balanceSnapshots?.incentiveSnapshots ? Object.fromEntries(
                                    Object.entries(bot.balanceSnapshots?.incentiveSnapshots).map(([key,
                                        value]) => [key,
                                        new BN(value.amount)])
                                ) : undefined,
                            },
                            after: {
                                targetBalanceAmount,
                                quoteBalanceAmount,
                                gasBalanceAmount,
                                incentiveBalanceAmounts,
                            },
                            positionId: bot.activePosition?.associatedPosition?.id ?? "",
                            closeTxHashes: transactionRecords?.map((record) => record.txHash) ?? [],
                            targetToken,
                            quoteToken,
                            gasToken,
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
            WinstonLog.ClosePositionJobConfirmed,
            {
                botId: bot.id,
                jobId: job.id,
                liquidityPoolId: liquidityPool.displayId,
            }
        )
    }
}