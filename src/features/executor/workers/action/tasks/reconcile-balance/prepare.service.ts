import {
    Injectable
} from "@nestjs/common"
import BN from "bn.js"
import {
    InjectPrimaryMongoose,
    JobSchema,
    JobType,
    StepType,
    TaskType,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    Connection
} from "mongoose"
import {
    InjectSuperJson, AsyncService
} from "@modules/mixin"
import SuperJSON from "superjson"
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
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
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
        // Heartbeat
        await this.sendHeartbeatService.process(
            {
                bot, job, bullmqJob
            }
        )
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
            await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                {
                    _id: job.id
                },
                {
                    $push: {
                        tasks: {
                            index: taskIndex,
                            type: TaskType.ReconcileBalance,
                            activeStep: 0,
                            stepCount: 0,
                            steps: [],
                        },
                    },
                },
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
                })

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
        const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: bot.targetToken.toString()
            },
        })
        if (!targetToken) throw new TokenNotFoundException({
            id: bot.targetToken.toString()
        })

        const quoteToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: bot.quoteToken.toString()
            },
        })
        if (!quoteToken) throw new TokenNotFoundException({
            id: bot.quoteToken.toString()
        })

        const gasToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            type: {
                $eq: TokenType.Native
            },
            chainId: {
                $eq: bot.chainId
            },
        })
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

        await this.connection.model<JobSchema>(JobSchema.name).updateOne(
            {
                _id: job.id
            },
            {
                $push: {
                    tasks: {
                        index: taskIndex,
                        type: TaskType.ReconcileBalance,
                        prepareResult: this.superJson.stringify(prepareResult),
                        activeStep: 0,
                        stepCount: prepareResult.prepareTxs.length,
                        steps: prepareResult.prepareTxs.map((prepareTx, index) => (
                            {
                                index,
                                type: StepType.Sign,
                                prepareTx: this.superJson.stringify(prepareTx),
                            }
                        )),
                    },
                },
            },
        )

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
    }
}
