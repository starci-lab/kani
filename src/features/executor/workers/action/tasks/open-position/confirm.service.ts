import {
    Injectable
} from "@nestjs/common"
import {
    OpenPositionTaskConfirmParams
} from "../types"
import {
    WinstonService, WinstonLog
} from "@modules/winston"
import {
    InjectPrimaryMongoose,
    JobSchema,
    JobType,
    TaskType,
    PrimaryMemoryStorageService,
    LiquidityPoolType,
    TransactionType
} from "@modules/databases"
import {
    Connection
} from "mongoose"
import {
    OpenPositionSnapshotService,
    BalanceFetcherService,
    ExecuteOpenPositionResult,
    PrepareOpenPositionResult,
    SignedTx,
    OpenPositionActionService,
    TransactionSnapshotService,
    BalanceSnapshotService
} from "@modules/blockchains"
import {
    envConfig
} from "@modules/env"
import BN from "bn.js"
import {
    BalanceSnapshotsNotFoundException,
    ActionJobStimulateMongoSessionException,
    TokenNotFoundException
} from "@modules/exceptions"
import {
    TokenType
} from "@modules/common"
import {
    InjectSuperJson
} from "@modules/mixin"
import SuperJSON from "superjson"
import {
    SendHeartbeatService
} from "../../send-heartbeat.service"
import {
    strict as assert 
} from "node:assert"

@Injectable()
export class OpenPositionTaskConfirmService {
    constructor(
        private readonly winstonService: WinstonService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly openPositionSnapshotService: OpenPositionSnapshotService,
        private readonly balanceFetcherService: BalanceFetcherService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly openPositionActionService: OpenPositionActionService,
        private readonly transactionSnapshotService: TransactionSnapshotService,
        private readonly balanceSnapshotService: BalanceSnapshotService,
        private readonly sendHeartbeatService: SendHeartbeatService,
    ) { }

    /**
     * Process the OPEN POSITION TASK CONFIRM step.
     * @param params - The parameters for the OPEN POSITION TASK CONFIRM step.
     * @param params.bot - The bot.
     * @param params.job - The job.
     * @param params.liquidityPool - The liquidity pool.
     * @param params.state - The state of the liquidity pool.
     * @param params.isRetry - Whether the task is being retried.
     * @param params.taskIndex - The index of the task.
     */
    async process(
        {
            bot,
            job,
            taskIndex,
            liquidityPool,
            state,
            bullmqJob,
        }: OpenPositionTaskConfirmParams
    ) {
        try {
            await this.sendHeartbeatService.process({
                bot,
                job,
                bullmqJob,
            })
            const fetch = await this.balanceFetcherService.fetchBalances(
                {
                    bot,
                }
            )
            const targetBalanceAmount = new BN(fetch.targetBalanceAmount)
            const quoteBalanceAmount = new BN(fetch.quoteBalanceAmount)
            const gasBalanceAmount = new BN(fetch.gasBalanceAmount)
            // update the job with the confirmed status
            if (!bot.balanceSnapshots) {
                throw new BalanceSnapshotsNotFoundException(
                    {
                        botId: bot.id,
                    }
                )
            }
            const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne({
                id: {
                    $eq: liquidityPool.tokenA.toString(),
                },
            })
            if (!targetToken) {
                throw new TokenNotFoundException(
                    {
                        id: liquidityPool.tokenA.toString(),
                    }
                )
            }
            const quoteToken = this.primaryMemoryStorageService.tokenCollection.findOne({
                id: {
                    $eq: liquidityPool.tokenB.toString(),
                },
            })
            if (!quoteToken) {
                throw new TokenNotFoundException(
                    {
                        id: liquidityPool.tokenB.toString(),
                    }
                )
            }
            const gasToken = this.primaryMemoryStorageService.tokenCollection.findOne({
                type: {
                    $eq: TokenType.Native,
                },
                chainId: {
                    $eq: bot.chainId,
                },
            })
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
            const targetIsA = liquidityPool.tokenA.toString() === targetToken.id
            const openPositionStepIndex = job.tasks[taskIndex].openPositionStepIndex ?? 0
            const executeResult = this.superJson.parse<ExecuteOpenPositionResult>(job.tasks[taskIndex].steps?.[openPositionStepIndex].executeResult ?? "")
            const prepareResult = this.superJson.parse<PrepareOpenPositionResult>(job.tasks[taskIndex].prepareResult ?? "")
            const signedTxs = (job.tasks[taskIndex].steps ?? []).map((step) => this.superJson.parse<SignedTx>(step.signedTx ?? ""))
            // confirm the open position
            const confirmResult = await this.openPositionActionService.confirm(
                {
                    bot,
                    liquidityPool,
                    positionId: executeResult?.positionId ?? "",
                    state,
                    metadata: prepareResult?.metadata,
                }
            )
            try {
                const session = await this.connection.startSession()
                await session.withTransaction(
                    async (clientSession) => {
                        // add the open position record
                        await this.openPositionSnapshotService.addOpenPositionRecord(
                            {
                                bot,
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
                                rentAmount: confirmResult?.rentAmount ?? new BN(0),
                                liquidityPool,
                                feeTargetAmount: targetIsA ? prepareResult?.feeAmountA ?? new BN(0) : prepareResult?.feeAmountB ?? new BN(0),
                                feeQuoteAmount: targetIsA ? prepareResult?.feeAmountB ?? new BN(0) : prepareResult?.feeAmountA ?? new BN(0),
                                targetToken,
                                quoteToken,
                                gasToken,
                                positionId: executeResult?.positionId ?? "",
                                openTxHashes: signedTxs.map((signedTx) => signedTx.txHash),
                                clmmParams: liquidityPool.type === LiquidityPoolType.Clmm ? {
                                    liquidity: confirmResult?.liquidity ?? new BN(0),
                                    tickLower: prepareResult?.tickLower ?? new BN(0),
                                    tickUpper: prepareResult?.tickUpper ?? new BN(0),
                                } : undefined,
                                dlmmParams: liquidityPool.type === LiquidityPoolType.Dlmm ? {
                                    minBinId: prepareResult?.minBinId ?? new BN(0),
                                    maxBinId: prepareResult?.maxBinId ?? new BN(0),
                                } : undefined,
                                metadata: prepareResult?.metadata,
                                session: clientSession,
                            }
                        )
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
                                        "task.type": TaskType.OpenPosition,
                                    },
                                ],
                                session: clientSession,
                            },
                        )
                        assert(updateJobResult.matchedCount > 0)
                        // update balance snapshots
                        await this.balanceSnapshotService.updateBotSnapshotBalancesRecord(
                            {
                                bot,
                                targetBalanceAmount,
                                quoteBalanceAmount,
                                gasBalanceAmount,
                                session: clientSession,
                            }
                        )
                        // add the transaction records
                        for (const signedTx of signedTxs) {
                            await this.transactionSnapshotService.addTransactionRecord(
                                {
                                    bot,
                                    txHash: signedTx.txHash,
                                    chainId: bot.chainId,
                                    type: TransactionType.OpenPosition,
                                    session: clientSession,
                                }
                            )
                        }
                        if (envConfig().executor.runtime.operation.openPosition.stimulate) {
                            throw new ActionJobStimulateMongoSessionException({
                                botId: bot.id,
                                jobId: job.id,
                                taskIndex,
                                liquidityPoolId: liquidityPool.displayId,
                            })
                        }
                    }
                )
            } catch (error) {
                if (!(error instanceof ActionJobStimulateMongoSessionException)) {
                    throw error
                }
            }
            this.winstonService.log(
                WinstonLog.ActionJobTaskConfirmed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: JobType.OpenPosition,
                    metadata: job.metadata,
                    taskIndex,
                    taskType: TaskType.OpenPosition,
                }
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.ActionJobTaskConfirmedFailed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: JobType.OpenPosition,
                    error: error.message,
                    taskIndex,
                    taskType: TaskType.OpenPosition,
                    metadata: job.metadata,
                }
            )
            throw error
        }
    }
}