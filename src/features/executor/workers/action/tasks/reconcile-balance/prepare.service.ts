import {
    Injectable
} from "@nestjs/common"
import BN from "bn.js"
import {
    TaskType,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    TokenType
} from "@modules/common"
import {
    BalanceFetcherService,
    EvalSnapshotService,
    SwapDirection,
    BalanceActionService,
    BalanceReconcileBalanceTokenInput,
    BalanceSnapshotService
} from "@modules/blockchains"
import {
    ActionJobTaskPrepareMaxAttemptsException,
    JobFailureException,
    TokenNotFoundException,
} from "@modules/exceptions"
import {
    SendHeartbeatService
} from "../../send-heartbeat.service"
import {
    WinstonLog, WinstonService
} from "@modules/winston"
import {
    ReconcileBalanceTaskPrepareParams
} from "../types"
import {
    JobFailureStrategy,
} from "@modules/common"
import {
    JobTaskService 
} from "../../update"
import {
    envConfig 
} from "@modules/env"
import {
    DebugContextService 
} from "../debug-context.service"
import {
    DebugLatencyService 
} from "@modules/debug"
import {
    RetryService
} from "@modules/mixin"
@Injectable()
export class ReconcileBalanceTaskPrepareService {
    constructor(
        private readonly balanceActionService: BalanceActionService,
        private readonly balanceFetcherService: BalanceFetcherService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly evalSnapshotService: EvalSnapshotService,
        private readonly sendHeartbeatService: SendHeartbeatService,
        private readonly winstonService: WinstonService,
        private readonly balanceSnapshotService: BalanceSnapshotService,
        private readonly jobTaskService: JobTaskService,
        private readonly debugContextService: DebugContextService,
        private readonly debugLatencyService: DebugLatencyService,
        private readonly retryService: RetryService,
    ) { }

    /**
     * Process the Reconcile Balance Task PREPARE step.
     * @param params - The parameters for the step.
     * @param params.bot - The bot.
     * @param params.taskIndex - The task index.
     * @param params.bullmqJob - The bullmq job.
     * @returns The result of the step.
     */
    async process(
        {
            bot,
            job,
            taskIndex,
            payload,
            bullmqJob,
            jobType,
        }: ReconcileBalanceTaskPrepareParams
    ) {
        // create the context payload for debug latency
        const contextPayload = this.debugContextService.createContextPayload({
            jobType,
            jobId: job.id,
            botId: bot.id,
        })
        try {
            // heartbeat
            await this.sendHeartbeatService.process(
                {
                    bot, 
                    job, 
                    bullmqJob, 
                }
            )
            // measure the latency
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Heartbeat sent successfully",
            })
            // we check if the task has reached the maximum number of attempts
            const retries = job.tasks?.[taskIndex]?.retries ?? 0
            const maxAttempts = envConfig().executor.workers.job.prepare.maxAttempts
            if (retries >= maxAttempts) {
                throw new JobFailureException({
                    originalError: new ActionJobTaskPrepareMaxAttemptsException({
                        maxAttempts,
                        botId: bot.id,
                        jobId: job.id,
                        metadata: job.metadata,
                        jobType,
                        taskType: TaskType.ReconcileBalance,
                        taskIndex,
                    }),
                    strategy: JobFailureStrategy.Fatal,
                })
            }
            // fetch the balances and update the balance snapshots
            let targetBalanceAmount = new BN(bot.balanceSnapshots?.targetBalanceAmount ?? 0)
            let quoteBalanceAmount = new BN(bot.balanceSnapshots?.quoteBalanceAmount ?? 0)
            let gasBalanceAmount = new BN(bot.balanceSnapshots?.gasBalanceAmount ?? 0)
            
            // if reconcile is not disabled, fetch the balances and update the balance snapshots
            if (payload.reconcile) {
                const fetched = await this.balanceFetcherService.fetchBalances({
                    bot
                })
                // measure the latency
                this.debugLatencyService.measure({
                    id: contextPayload.id,
                    description: "Balances fetched successfully",
                })
                targetBalanceAmount = new BN(fetched.targetBalanceAmount)
                quoteBalanceAmount = new BN(fetched.quoteBalanceAmount)
                gasBalanceAmount = new BN(fetched.gasBalanceAmount)
                // update the balance snapshotsz
                await this.balanceSnapshotService.updateBotSnapshotBalancesRecord(
                    {
                        bot,
                        targetBalanceAmount,
                        quoteBalanceAmount,
                        gasBalanceAmount,
                    }
                )
                // measure the latency
                this.debugLatencyService.measure({
                    id: contextPayload.id,
                    description: "Balance snapshots updated successfully",
                })
            }
            // check eligibility
            const { eligible } = await this.evalSnapshotService.eval(
                {
                    bot
                }
            )
            // measure the latency
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Snapshot evaluated successfully",
            })
            if (!eligible || !payload.swap) {
                // Push a "no-op" task (0 steps) so dispatcher can mark it done immediately
                // upsert the prepared task into the database
                await this.jobTaskService.upsertPreparedTask(
                    {
                        jobId: job.id,
                        taskType: TaskType.ReconcileBalance,
                        taskIndex,
                        prepareResult: {
                            prepareTxs: [],
                        },
                    }
                )
                // measure the latency
                this.debugLatencyService.measure({
                    id: contextPayload.id,
                    description: "No-op task upserted successfully",
                })
                this.winstonService.log(
                    WinstonLog.ActiveJobTaskPrepared,
                    {
                        botId: bot.id,
                        jobId: job.id,
                        jobType,
                        txCount: 0,
                        metadata: job.metadata,
                        taskIndex,
                        taskType: TaskType.ReconcileBalance,
                    }
                )
                return
            }
            // determine swap steps
            const { 
                swapSteps, 
                quoteRatioResult 
            } = await this.balanceActionService.determineReconcileBalancePlan(
                {
                    bot,
                    targetBalanceAmount,
                    quoteBalanceAmount,
                    gasBalanceAmount,
                }
            )
            // measure the latency
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Reconcile balance plan determined successfully",
            })
            this.winstonService.log(
                WinstonLog.ReconcileBalancePlanDetermined,
                {
                    botId: bot.id,
                    jobId: job.id,
                    quoteRatioResult: quoteRatioResult,
                    swapSteps: swapSteps,
                }
            )
            // 4) Resolve tokens
            const targetToken = this.primaryMemoryStorageService.tokenMap.get(bot.targetToken.toString())
            if (!targetToken) throw new TokenNotFoundException({
                id: bot.targetToken.toString()
            })

            const quoteToken = this.primaryMemoryStorageService.tokenMap.get(bot.quoteToken.toString())
            if (!quoteToken) throw new TokenNotFoundException({
                id: bot.quoteToken.toString()
            })

            const gasToken = Array.from(this.primaryMemoryStorageService.tokenMap.values()).find(
                (token) => token.type === TokenType.Native && token.chainId === bot.chainId,
            )
            if (!gasToken) {
                throw new TokenNotFoundException({
                    conditions: {
                        type: TokenType.Native, chainId: bot.chainId
                    },
                })
            }
            // 5) Convert swap steps -> tokenInputs
            const tokenInputs: Array<BalanceReconcileBalanceTokenInput> = []

            for (const swapStep of swapSteps) {
                const { direction, usedAmount } = swapStep

                switch (direction) {
                case SwapDirection.TargetToQuote:
                    tokenInputs.push({
                        tokenIn: targetToken, tokenOut: quoteToken, amount: usedAmount
                    })
                    break
                case SwapDirection.QuoteToTarget:
                    tokenInputs.push({
                        tokenIn: quoteToken, tokenOut: targetToken, amount: usedAmount
                    })
                    break
                case SwapDirection.TargetToGas:
                    tokenInputs.push({
                        tokenIn: targetToken, tokenOut: gasToken, amount: usedAmount
                    })
                    break
                case SwapDirection.QuoteToGas:
                    tokenInputs.push({
                        tokenIn: quoteToken, tokenOut: gasToken, amount: usedAmount
                    })
                    break
                }
            }
            // 6) Prepare transactions
            const prepareResult = await this.retryService.retry(
                {
                    action: async () => {
                        return await this.balanceActionService.prepareReconcileBalanceTransaction(
                            {
                                bot,
                                tokenInputs,
                            }
                        )
                    },
                    options: {
                        retries: envConfig().executor.workers.job.prepare.maxAttempts,
                        minTimeout: envConfig().executor.workers.job.prepare.minTimeout,
                        maxTimeout: envConfig().executor.workers.job.prepare.maxTimeout,
                        onFailedAttempt: async (context) => {
                            this.winstonService.log(
                                WinstonLog.ActionJobPrepareFailedAttempt,
                                {
                                    botId: bot.id,
                                    jobId: job.id,
                                    jobType,
                                    taskIndex,
                                    taskType: TaskType.ReconcileBalance,
                                    metadata: job.metadata,
                                    attemptsMade: context.attemptNumber,
                                }
                            )
                        },
                    },
                }
            )
            // measure the latency
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Reconcile balance transactions prepared successfully",
            })
            // upsert the prepared task into the database
            await this.jobTaskService.upsertPreparedTask({
                jobId: job.id,
                taskType: TaskType.ReconcileBalance,
                taskIndex,
                prepareResult,
            })
            // measure the latency
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Prepared task upserted successfully",
            })
            // log the prepared task
            this.winstonService.log(
                WinstonLog.ActiveJobTaskPrepared,
                {
                    botId: bot.id,
                    jobId: job.id,
                    jobType,
                    txCount: prepareResult.prepareTxs.length,
                    metadata: job.metadata,
                    taskIndex,
                    taskType: TaskType.ReconcileBalance,
                }
            )
        } catch (error) {
            // we log the failed task
            this.winstonService.log(
                WinstonLog.ActiveJobTaskPreparedFailed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    jobType,
                    error: error.message,
                    taskIndex,
                    taskType: TaskType.ReconcileBalance,
                    metadata: job.metadata,
                }
            )
            // throw prepare failed exception
            throw new JobFailureException(
                {
                    originalError: error,
                    strategy: JobFailureStrategy.Fatal,
                }
            )
        }
    }
}
