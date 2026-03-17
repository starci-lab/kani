import {
    Injectable
} from "@nestjs/common"
import {
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
import {
    MountStorageService,
} from "@modules/filesystem"
import {
    DebugContextService,
} from "../debug-context.service"
import {
    DebugLatencyService,
} from "@modules/debug"
import {
    RetryService
} from "@modules/mixin"

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
        private readonly mountStorageService: MountStorageService,
        private readonly debugContextService: DebugContextService,
        private readonly debugLatencyService: DebugLatencyService,
        private readonly retryService: RetryService,
    ) { }

    async process({
        bot,
        job,
        taskIndex,
        payload,
        bullmqJob,
        jobType,
    }: TransferFeesTaskPrepareParams) {
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
            const retries = job.tasks?.[taskIndex]?.retries ?? 0
            if (retries >= envConfig().executor.workers.job.prepare.maxAttempts) {
                throw new JobFailureException({
                    originalError: new ActionJobTaskPrepareMaxAttemptsException({
                        maxAttempts: envConfig().executor.workers.job.prepare.maxAttempts,
                        botId: bot.id,
                        jobId: job.id,
                        metadata: job.metadata,
                        jobType,
                        taskType: TaskType.TransferFees,
                        taskIndex,
                    }),
                    strategy: JobFailureStrategy.Fatal,
                })
            }
            const targetToken =
                this.primaryMemoryStorageService.tokenMap.get(bot.targetToken.toString())
            if (!targetToken) {
                throw new TokenNotFoundException({
                    id: bot.targetToken.toString(),
                })
            }
            const quoteToken =
                this.primaryMemoryStorageService.tokenMap.get(bot.quoteToken.toString())
            if (!quoteToken) {
                throw new TokenNotFoundException({
                    id: bot.quoteToken.toString(),
                })
            }
            const gasToken = Array.from(this.primaryMemoryStorageService.tokenMap.values()).find(
                (token) => token.type === TokenType.Native && token.chainId === bot.chainId,
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
                this.debugLatencyService.measure({
                    id: contextPayload.id,
                    description: "Fetch balances successfully",
                })
                targetBalanceAmount = new BN(fetched.targetBalanceAmount)
                quoteBalanceAmount = new BN(fetched.quoteBalanceAmount)
                gasBalanceAmount = new BN(fetched.gasBalanceAmount)
                await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                    bot,
                    targetBalanceAmount,
                    quoteBalanceAmount,
                    gasBalanceAmount,
                })
                this.debugLatencyService.measure({
                    id: contextPayload.id,
                    description: "Update balance snapshots successfully",
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
                    },
                )
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Convert to target successfully",
            })
            // we compute the ratio
            const targetRatio = targetAmountInTarget.div(targetAmountInTarget.add(quoteAmountInTarget))
            const quoteRatio = quoteAmountInTarget.div(targetAmountInTarget.add(quoteAmountInTarget))
            // compute the fees amount in target token
            const feeRate = new Decimal(this.mountStorageService.appConfig.fees.feeRate)
            const pnlFee = pnl.mul(feeRate)
            const feeAmountTarget = pnlFee.mul(targetRatio)
            const feeAmountQuoteInTarget = pnlFee.mul(quoteRatio)
            const { 
                amountInTargetRaw: feeAmountQuote 
            } = await this.balanceConvertService.convertSingleAmountDecimalToTarget(
                {
                    amount: feeAmountQuoteInTarget,
                    fromToken: targetToken,
                    targetToken: quoteToken,
                },
            )
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Convert fee amount successfully",
            })
            const prepareResult = 
                await this.retryService.retry({
                    action: async () => {
                        return await this.balanceActionService.prepareTransferFeesTransaction(
                            {
                                bot,
                                feeAmountTarget: toRawAmount(
                                    {
                                        amount: feeAmountTarget,
                                        decimals: new Decimal(targetToken.decimals),
                                    }
                                ),
                                feeAmountQuote,
                            }
                        )
                    },
                    options: {
                        retries: envConfig().executor.workers.job.prepare.maxAttempts,
                        minTimeout: envConfig().executor.workers.job.prepare.minTimeout,
                        maxTimeout: envConfig().executor.workers.job.prepare.maxTimeout,
                        onFailedAttempt: async (context) => {
                            // log the failed attempt
                            this.winstonService.log(
                                WinstonLog.ActionJobPrepareFailedAttempt,
                                {
                                    botId: bot.id,
                                    jobId: job.id,
                                    jobType,
                                    taskIndex,
                                    taskType: TaskType.TransferFees,
                                    metadata: job.metadata,
                                    attemptsMade: context.attemptNumber,
                                }
                            )
                        },
                    },
                }
                )
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Prepare transfer fees transaction successfully",
            })
            await this.jobTaskService.upsertPreparedTask(
                {
                    jobId: job.id,
                    taskType: TaskType.TransferFees,
                    taskIndex,
                    prepareResult,
                },
            )
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Upsert prepared task successfully",
            })
            this.winstonService.log(
                WinstonLog.ActiveJobTaskPrepared,
                {
                    botId: bot.id,
                    jobId: job.id,
                    jobType,
                    txCount: prepareResult.prepareTxs.length,
                    metadata: job.metadata,
                    taskIndex,
                    taskType: TaskType.TransferFees,
                }
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.ActiveJobTaskPreparedFailed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    jobType,
                    error: error.message,
                    taskIndex,
                    taskType: TaskType.TransferFees,
                    metadata: job.metadata,
                }
            )
            throw new JobFailureException(
                {
                    originalError: error,
                    strategy: JobFailureStrategy.Fatal,
                }
            )
        }
    }
}
