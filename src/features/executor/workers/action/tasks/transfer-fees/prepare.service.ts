import {
    Injectable
} from "@nestjs/common"
import {
    JobType,
    TaskType,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    BalanceSnapshotService,
    BalanceConvertService,
    BalanceActionService,
    BalanceFetcherService,
} from "@modules/blockchains"
import {
    TransferFeesTaskPrepareParams
} from "../types"
import {
    SendHeartbeatService
} from "../../send-heartbeat.service"
import {
    WinstonLog, WinstonService
} from "@modules/winston"
import {
    JobFailureStrategy, TokenType, toRawAmount
} from "@modules/common"
import {
    ActionJobTaskPrepareMaxAttemptsException,
    ActivePositionNotFoundException,
    JobFailureException,
    TokenNotFoundException,
} from "@modules/exceptions"
import {
    JobTaskService
} from "../../update"
import {
    envConfig
} from "@modules/env"
import BN from "bn.js"
import Decimal from "decimal.js"

@Injectable()
export class TransferFeesTaskPrepareService {
    constructor(
        private readonly balanceActionService: BalanceActionService,
        private readonly balanceFetcherService: BalanceFetcherService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly sendHeartbeatService: SendHeartbeatService,
        private readonly winstonService: WinstonService,
        private readonly jobTaskService: JobTaskService,
        private readonly balanceSnapshotService: BalanceSnapshotService,
        private readonly balanceConvertService: BalanceConvertService,
    ) { }

    async process({
        bot,
        job,
        taskIndex,
        payload,
        bullmqJob,
    }: TransferFeesTaskPrepareParams) {
        try {
            await this.sendHeartbeatService.process({
                bot,
                job,
                bullmqJob,
            })
            const retries = job.tasks?.[taskIndex]?.retries ?? 0
            if (retries >= envConfig().executor.workers.job.prepareMaxAttempts) {
                throw new JobFailureException({
                    originalError: new ActionJobTaskPrepareMaxAttemptsException({
                        maxAttempts: envConfig().executor.workers.job.prepareMaxAttempts,
                        botId: bot.id,
                        jobId: job.id,
                        metadata: job.metadata,
                        type: TaskType.TransferFees,
                    }),
                    strategy: JobFailureStrategy.Fatal,
                })
            }
            const targetToken =
                this.primaryMemoryStorageService.tokenCollection.findOne({
                    id: {
                        $eq: bot.targetToken.toString(),
                    },
                })
            if (!targetToken) {
                throw new TokenNotFoundException({
                    id: bot.targetToken.toString(),
                })
            }
            const quoteToken =
                this.primaryMemoryStorageService.tokenCollection.findOne({
                    id: {
                        $eq: bot.quoteToken.toString(),
                    },
                })
            if (!quoteToken) {
                throw new TokenNotFoundException({
                    id: bot.quoteToken.toString(),
                })
            }
            const gasToken = this.primaryMemoryStorageService.tokenCollection.findOne(
                {
                    type: {
                        $eq: TokenType.Native,
                    },
                    chainId: {
                        $eq: bot.chainId,
                    },
                },
            )
            if (!gasToken) {
                throw new TokenNotFoundException({
                    conditions: {
                        type: TokenType.Native,
                        chainId: bot.chainId,
                    },
                })
            }
            // fetch the balances and update the balance snapshots
            let targetBalanceAmount = new BN(
                bot.balanceSnapshots?.targetBalanceAmount ?? 0,
            )
            let quoteBalanceAmount = new BN(
                bot.balanceSnapshots?.quoteBalanceAmount ?? 0,
            )
            let gasBalanceAmount = new BN(
                bot.balanceSnapshots?.gasBalanceAmount ?? 0,
            )

            // if reconcile is not disabled, fetch the balances and update the balance snapshots
            if (payload.reconcile) {
                const fetched = await this.balanceFetcherService.fetchBalances({
                    bot,
                })
                targetBalanceAmount = new BN(fetched.targetBalanceAmount)
                quoteBalanceAmount = new BN(fetched.quoteBalanceAmount)
                gasBalanceAmount = new BN(fetched.gasBalanceAmount)
                // update the balance snapshotsz
                await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                    bot,
                    targetBalanceAmount,
                    quoteBalanceAmount,
                    gasBalanceAmount,
                })
            }
            // we take the position of the bot and calculate the current target token balance amount
            const activePosition = bot.activePosition?.associatedPosition
            if (!activePosition) {
                throw new ActivePositionNotFoundException({
                    botId: bot.id,
                })
            }
            const pnl = new Decimal(activePosition.performance?.pnl ?? 0)
            const { targetAmountInTarget, quoteAmountInTarget } =
                await this.balanceConvertService.convertToTarget(
                    {
                        bot,
                    }
                )
            // we compute the ratio
            const targetRatio = targetAmountInTarget.div(targetAmountInTarget.add(quoteAmountInTarget))
            const quoteRatio = quoteAmountInTarget.div(targetAmountInTarget.add(quoteAmountInTarget))
            // compute the fees amount in target token
            const feeAmountTarget = pnl.mul(targetRatio)
            const feeAmountQuoteInTarget = pnl.mul(quoteRatio)
            const { 
                amountInTargetRaw: feeAmountQuote 
            } = await this.balanceConvertService.convertSingleAmountDecimalToTarget(
                {
                    amount: feeAmountQuoteInTarget,
                    fromToken: targetToken,
                    targetToken: quoteToken,
                }
            )
            // compute percent
            const prepareResult =
                await this.balanceActionService.prepareTransferFeesTransaction(
                    {
                        bot,
                        feeAmountTarget: toRawAmount({
                            amount: feeAmountTarget,
                            decimals: new Decimal(targetToken.decimals),
                        }),
                        feeAmountQuote,
                    }
                )
            // we convert the fee amount to quote token
            await this.jobTaskService.upsertPreparedTask({
                jobId: job.id,
                taskType: TaskType.TransferFees,
                taskIndex,
                prepareResult,
            })
            // we log the prepared task
            this.winstonService.log(
                WinstonLog.ActiveJobTaskPrepared,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: job.type ?? JobType.OpenPosition,
                    txCount: prepareResult.prepareTxs.length,
                    metadata: job.metadata,
                    taskIndex,
                    taskType: TaskType.TransferFees,
                }
            )
        } catch (error) {
            // we log the failed task
            this.winstonService.log(
                WinstonLog.ActiveJobTaskPreparedFailed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: job.type ?? JobType.OpenPosition,
                    error: error.message,
                    taskIndex,
                    taskType: TaskType.TransferFees,
                    metadata: job.metadata,
                }
            )
            // we throw an error
            throw new JobFailureException({
                originalError: error,
                strategy: JobFailureStrategy.Fatal,
            })
        }
    }
}
