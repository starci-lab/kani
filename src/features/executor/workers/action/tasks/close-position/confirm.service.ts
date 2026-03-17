import {
    Injectable
} from "@nestjs/common"
import {
    ClosePositionTaskConfirmParams
} from "../types"
import {
    WinstonService, WinstonLog
} from "@modules/winston"
import {
    InjectPrimaryMongoose,
    JobSchema,
    TaskType,
    PrimaryMemoryStorageService,
    TransactionType,
} from "@modules/databases"
import {
    Connection
} from "mongoose"
import {
    BalanceFetcherService,
    BalanceSnapshotService,
    ClosePositionSnapshotService,
    SignedTx,
    TransactionSnapshotService
} from "@modules/blockchains"
import {
    DynamicClmmRewardInfo,
    DynamicDlmmRewardInfo
} from "@modules/cache"
import {
    ActionJobStimulateMongoSessionException,
    TokenNotFoundException
} from "@modules/exceptions"
import _ from "lodash"
import BN from "bn.js"
import {
    InjectSuperJson
} from "@modules/mixin"
import SuperJSON from "superjson"
import {
    TokenType
} from "@modules/common"
import {
    envConfig
} from "@modules/env"
import {
    strict as assert,
} from "node:assert"
import {
    SendHeartbeatService,
} from "../../send-heartbeat.service"
import {
    DebugContextService,
} from "../debug-context.service"
import {
    DebugLatencyService,
} from "@modules/debug"

@Injectable()
export class ClosePositionTaskConfirmService {
    constructor(
        private readonly winstonService: WinstonService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly balanceFetcherService: BalanceFetcherService,
        private readonly balanceSnapshotService: BalanceSnapshotService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly closePositionSnapshotService: ClosePositionSnapshotService,
        private readonly sendHeartbeatService: SendHeartbeatService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly transactionSnapshotService: TransactionSnapshotService,
        private readonly debugContextService: DebugContextService,
        private readonly debugLatencyService: DebugLatencyService,
    ) { }

    /**
     * Process the CLOSE POSITION TASK CONFIRM step.
     * @param params - The parameters for the CLOSE POSITION TASK CONFIRM step.
     * @param params.bot - The bot.
     * @param params.job - The job. 
     * @param params.state - The state of the liquidity pool.
     * @param params.isRetry - Whether the task is being retried.
     * @param params.taskIndex - The index of the task.
     */
    async process(
        {
            bot,
            job,
            taskIndex,
            state,
            liquidityPool,
            bullmqJob,
            payload,
            jobType,
        }: ClosePositionTaskConfirmParams
    ) {
        const contextPayload = this.debugContextService.createContextPayload({
            jobType,
            jobId: job.id,
            botId: bot.id,
        })
        try {
            await this.sendHeartbeatService.process({
                bot,
                job,
                bullmqJob,
            })
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Heartbeat sent successfully",
            })
            const targetToken = this.primaryMemoryStorageService.tokenMap.get(liquidityPool.tokenA.toString())
            if (!targetToken) {
                throw new TokenNotFoundException(
                    {
                        id: liquidityPool.tokenA.toString(),
                    }
                )
            }
            const quoteToken = this.primaryMemoryStorageService.tokenMap.get(liquidityPool.tokenB.toString())
            if (!quoteToken) {
                throw new TokenNotFoundException(
                    {
                        id: liquidityPool.tokenB.toString(),
                    }
                )
            }
            const gasToken = Array.from(this.primaryMemoryStorageService.tokenMap.values()).find(
                (token) => token.type === TokenType.Native && token.chainId === bot.chainId,
            )
            if (!gasToken) {
                throw new TokenNotFoundException(
                    {
                        conditions: {
                            type: TokenType.Native,
                            chainId: bot.chainId,
                        },
                    }
                )
            }
            const rewardTokenAddresses = state.rewards.map((
                reward: DynamicClmmRewardInfo | DynamicDlmmRewardInfo
            ) => reward.tokenAddress
            )
            // Get reward tokens that are NOT target or quote token
            const nonPairRewardTokenAddresses = _.difference(
                rewardTokenAddresses,
                [
                    targetToken.tokenAddress,
                    quoteToken.tokenAddress
                ]
            )
            const nonPairRewardTokens = Array.from(this.primaryMemoryStorageService.tokenMap.values()).filter(
                (token) => nonPairRewardTokenAddresses.includes(token.tokenAddress),
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
                },
            )
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Fetch balances successfully",
            })
            const signedTxs = (job.tasks[taskIndex].steps ?? []).map((step) => this.superJson.parse<SignedTx>(step.signedTx ?? ""))
            try {
                const session = await this.connection.startSession()
                await session.withTransaction(async (
                    clientSession
                ) => {
                    // update balance snapshots
                    await this.balanceSnapshotService.updateBotSnapshotBalancesRecord(
                        {
                            bot,
                            targetBalanceAmount,
                            quoteBalanceAmount,
                            gasBalanceAmount,
                            session: clientSession,
                            incentiveBalanceAmounts,
                        }
                    )
                    // update the close position record
                    await this.closePositionSnapshotService.updateClosePositionRecord(
                        {
                            positionSettlements: payload.positionSettlements,
                            before: {
                                targetBalanceAmount: new BN(bot.balanceSnapshots?.targetBalanceAmount ?? 0),
                                quoteBalanceAmount: new BN(bot.balanceSnapshots?.quoteBalanceAmount ?? 0),
                                gasBalanceAmount: new BN(bot.balanceSnapshots?.gasBalanceAmount ?? 0),
                                incentiveBalanceAmounts: bot.balanceSnapshots?.incentiveSnapshots ? Object.fromEntries(
                                    Object.entries(bot.balanceSnapshots?.incentiveSnapshots).map((
                                        [
                                            key,
                                            value
                                        ]) => [
                                        key,
                                        new BN(value.amount)
                                    ])
                                ) : undefined,
                            },
                            after: {
                                targetBalanceAmount,
                                quoteBalanceAmount,
                                gasBalanceAmount,
                                incentiveBalanceAmounts,
                            },
                            positionId: bot.activePosition?.associatedPosition?.id ?? "",
                            closeTxHashes: signedTxs.map((signedTx) => signedTx.txHash),
                            targetToken,
                            quoteToken,
                            gasToken,
                            session: clientSession,
                            bot,
                        }
                    )
                    // update the transaction records
                    for (const signedTx of signedTxs) {
                        await this.transactionSnapshotService.addTransactionRecord(
                            {
                                bot,
                                txHash: signedTx.txHash,
                                chainId: bot.chainId,
                                type: TransactionType.ClosePosition,
                                session: clientSession,
                            }
                        )
                    }
                    // update the job with the confirmed status
                    const updateJobResult = await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                        {
                            _id: job.id,
                        },
                        {
                            $set: {
                                "tasks.$[task].confirmed": true,
                            },
                            $inc: {
                                taskIndex: 1,
                            },
                        },
                        {
                            arrayFilters: [
                                {
                                    "task.index": taskIndex,
                                    "task.type": TaskType.ClosePosition,
                                },
                            ],
                            session: clientSession,
                        },
                    )
                    assert(updateJobResult.matchedCount > 0)
                    // throw an exception to stimulate the mongo session
                    if (envConfig().executor.runtime.operation.closePosition.stimulate) {
                        throw new ActionJobStimulateMongoSessionException({
                            botId: bot.id,
                            jobId: job.id,
                            taskIndex,
                            liquidityPoolId: liquidityPool.displayId,
                        })
                    }
                })
            } catch (error) {
                if (!(error instanceof ActionJobStimulateMongoSessionException)) {
                    throw error
                }
            }
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Confirm transaction successfully",
            })
            this.winstonService.log(
                WinstonLog.ActionJobTaskConfirmed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    jobType,
                    metadata: job.metadata,
                    taskIndex,
                    taskType: TaskType.ClosePosition,
                }
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.ActionJobTaskConfirmedFailed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    jobType,
                    taskIndex,
                    taskType: TaskType.ClosePosition,
                    error: error.message,
                    metadata: job.metadata,
                }
            )
            throw error
        }
    }
}