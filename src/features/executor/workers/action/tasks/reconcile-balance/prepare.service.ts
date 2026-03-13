import {
    Injectable
} from "@nestjs/common"
import BN from "bn.js"
import {
    JobType,
    TaskType,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    AsyncService
} from "@modules/mixin"
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
    PrepareReconcileBalanceTransactionResultNotFoundException,
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

@Injectable()
export class ReconcileBalanceTaskPrepareService {
    constructor(
        private readonly balanceActionService: BalanceActionService,
        private readonly balanceFetcherService: BalanceFetcherService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly evalSnapshotService: EvalSnapshotService,
        private readonly asyncService: AsyncService,
        private readonly sendHeartbeatService: SendHeartbeatService,
        private readonly winstonService: WinstonService,
        private readonly balanceSnapshotService: BalanceSnapshotService,
        private readonly jobTaskService: JobTaskService,
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
        }: ReconcileBalanceTaskPrepareParams
    ) {
        try {
            // heartbeat
            await this.sendHeartbeatService.process(
                {
                    bot, 
                    job, 
                    bullmqJob, 
                }
            )
            // we check if the task has reached the maximum number of attempts
            const retries = job.tasks?.[taskIndex]?.retries ?? 0
            if (retries >= envConfig().executor.workers.job.prepareMaxAttempts) {
                throw new JobFailureException({
                    originalError: new ActionJobTaskPrepareMaxAttemptsException({
                        maxAttempts: envConfig().executor.workers.job.prepareMaxAttempts,
                        botId: bot.id,
                        jobId: job.id,
                        metadata: job.metadata,
                        type: TaskType.ReconcileBalance,
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
            }
            // check eligibility
            const { eligible } = await this.evalSnapshotService.eval(
                {
                    bot
                }
            )
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
                this.winstonService.log(
                    WinstonLog.ActiveJobTaskPrepared,
                    {
                        botId: bot.id,
                        jobId: job.id,
                        type: JobType.ReconcileBalance,
                        txCount: 0,
                        metadata: job.metadata,
                        taskIndex,
                        taskType: TaskType.ReconcileBalance,
                    }
                )
                return
            }
            // determine swap steps
            const { swapSteps, quoteRatioResult } =
            await this.balanceActionService.determineReconcileBalancePlan(
                {
                    bot,
                    targetBalanceAmount,
                    quoteBalanceAmount,
                    gasBalanceAmount,
                }
            )

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
                (t) => t.type === TokenType.Native && t.chainId === bot.chainId,
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
            const [
                prepareResult,
                error
            ] = await this.asyncService.resolveTuple(
                this.balanceActionService.prepareReconcileBalanceTransaction(
                    {
                        bot,
                        tokenInputs,
                    }
                ),
            )
            if (error) {
                throw new JobFailureException({
                    originalError: error,
                    strategy: JobFailureStrategy.Fatal,
                })
            }
            if (!prepareResult) {
                throw new PrepareReconcileBalanceTransactionResultNotFoundException({
                    botId: bot.id,
                    jobId: job.id,
                })
            }
            // upsert the prepared task into the database
            await this.jobTaskService.upsertPreparedTask({
                jobId: job.id,
                taskType: TaskType.ReconcileBalance,
                taskIndex,
                prepareResult,
            })
            // log the prepared task
            this.winstonService.log(
                WinstonLog.ActiveJobTaskPrepared,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: JobType.ReconcileBalance,
                    txCount: prepareResult.prepareTxs.length,
                    metadata: job.metadata,
                    taskIndex,
                    taskType: TaskType.ReconcileBalance,
                }
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.ActiveJobTaskPreparedFailed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: JobType.ReconcileBalance,
                    error: error.message,
                    taskIndex,
                    taskType: TaskType.ReconcileBalance,
                    metadata: job.metadata,
                }
            )
            throw new JobFailureException({
                originalError: error,
                strategy: JobFailureStrategy.Fatal,
            })
        }
    }
}
