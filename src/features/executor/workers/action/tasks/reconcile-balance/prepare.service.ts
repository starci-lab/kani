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
} from "@modules/blockchains"
import {
    JobFailureException,
    JobFailureStrategy,
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
        await this.sendHeartbeatService.process({
            bot, job, bullmqJob
        })
        const fetched = await this.balanceFetcherService.fetchBalances({
            bot
        })
        const targetBalanceAmount = new BN(fetched.targetBalanceAmount)
        const quoteBalanceAmount = new BN(fetched.quoteBalanceAmount)
        const gasBalanceAmount = new BN(fetched.gasBalanceAmount)
        // 2) Eligibility gate
        const { eligible } = await this.evalSnapshotService.eval({
            bot
        })
        if (!eligible || payload.noSwap) {
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
                })

            return
        }

        // 3) Determine plan (swap steps)
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
        const [prepareResult,
            error] = await this.asyncService.resolveTuple(
            this.balanceActionService.prepareReconcileBalanceTransaction({
                bot,
                tokenInputs,
            }),
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
            }
        )
    }
}
