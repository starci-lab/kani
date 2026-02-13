import {
    Injectable,
} from "@nestjs/common"
import type {
    BalanceAmounts,
} from "@modules/common"
import type {
    PrepareParams,
    PrepareResult,
    ReconcileBalanceJobData,
} from "./types"
import {
    getJobStatusOrder,
    InjectPrimaryMongoose,
    JobSchema,
    JobStatus,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import BN from "bn.js"
import {
    JobFailureException,
    JobFailureStrategy,
    PrepareReconcileBalanceTransactionResultNotFoundException,
    TokenNotFoundException,
} from "@modules/exceptions"
import {
    TokenType,
    ToStringObject,
} from "@modules/common"
import {
    SwapDirection,
    BalanceFetcherService,
    EvalSnapshotService,
} from "@modules/blockchains"
import {
    BalanceActionService,
    BalanceReconcileBalanceTokenInput,
} from "@modules/blockchains"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"
import {
    Connection,
} from "mongoose"
import {
    DayjsService,
    AsyncService,
} from "@modules/mixin"
import {
    SerializerService,
} from "../common"

/**
 * Service for the PREPARE phase of reconcile-balance jobs.
 *
 * @example
 * const result = await prepareService.process({ job, bot, payload })
 */
@Injectable()
export class PrepareService {
    constructor(
        private readonly balanceActionService: BalanceActionService,
        private readonly balanceFetcherService: BalanceFetcherService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly winstonService: WinstonService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dayjsService: DayjsService,
        private readonly asyncService: AsyncService,
        private readonly evalSnapshotService: EvalSnapshotService,
        private readonly serializerService: SerializerService,
    ) {}

    /**
     * PREPARE phase: ensures balances, computes reconcile plan, prepares swap transactions.
     *
     * @param params - Prepare params (job, bot, payload)
     * @returns Prepare result with prepareResult data
     *
     * @example
     * const result = await prepareService.process({ job, bot, payload })
     */
    async process(
        params: PrepareParams
    ): Promise<PrepareResult> {
        const { 
            job, 
            bot, 
            payload: { 
                gasBalanceAmount, 
                quoteBalanceAmount, 
                targetBalanceAmount 
            }
        } = params
        // guard: idempotency (return persisted data if already prepared)
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Prepared)
        ) {
            const jobData = this.serializerService.deserialize<ReconcileBalanceJobData>(
                job.data as Partial<ToStringObject<ReconcileBalanceJobData>>
            )
            this.winstonService.log(
                WinstonLog.ReconcileBalanceJobAlreadyPrepared,
                {
                    botId: bot.id,
                    jobId: job.id,
                    ageMs: this.dayjsService.now()
                        .diff(job.createdAt,
                            "millisecond"
                        ),
                    quoteRatioResult: jobData?.logging?.quoteRatioResult,
                    balanceAmounts: jobData?.logging?.balanceAmounts,
                    txHashes: jobData?.prepareResult?.prepareTxs.map((prepareTx) => prepareTx.txHash),
                }
            )
            return {
                data: jobData
            }
        }
        // init balance amounts (BN)
        let gasBalanceAmountBN = new BN(0)
        let quoteBalanceAmountBN = new BN(0)
        let targetBalanceAmountBN = new BN(0)
        // fetch balances if missing from payload
        if (
            !gasBalanceAmount || !quoteBalanceAmount || !targetBalanceAmount
        ) {
            const {
                targetBalanceAmount,
                quoteBalanceAmount,
                gasBalanceAmount
            } = await this.balanceFetcherService.fetchBalances(
                {
                    bot,
                }
            )
            gasBalanceAmountBN = gasBalanceAmount
            quoteBalanceAmountBN = quoteBalanceAmount
            targetBalanceAmountBN = targetBalanceAmount
        } else {
            // use payload balances
            gasBalanceAmountBN = gasBalanceAmount
            quoteBalanceAmountBN = quoteBalanceAmount
            targetBalanceAmountBN = targetBalanceAmount
        }
        const { eligible } = await this.evalSnapshotService.eval(
            {
                bot,
            }
        )
        if (!eligible) {
            this.winstonService.log(
                WinstonLog.ReconcileBalanceJobPrepared,
                {
                    botId: bot.id,
                    jobId: job.id,
                    txHashes: undefined,
                    balanceAmounts: {
                        targetBalanceAmount: targetBalanceAmountBN.toString(),
                        quoteBalanceAmount: quoteBalanceAmountBN.toString(),
                        gasBalanceAmount: gasBalanceAmountBN.toString(),
                    },
                }
            )
            return {
                data: {   
                }
            }
        }
        // compute reconcile plan (swap steps)
        const { swapSteps, quoteRatioResult } =
            await this.balanceActionService.determineReconcileBalancePlan(
                {
                    bot,
                    targetBalanceAmount: targetBalanceAmountBN,
                    quoteBalanceAmount: quoteBalanceAmountBN,
                    gasBalanceAmount: gasBalanceAmountBN,
                }
            )
        const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne(
            {
                id: {
                    $eq: bot.targetToken.toString()
                }
            }
        )
        if (!targetToken) {
            throw new TokenNotFoundException(
                {
                    id: bot.targetToken.toString()
                }
            )
        }
        const quoteToken = this.primaryMemoryStorageService.tokenCollection.findOne(
            {
                id: {
                    $eq: bot.quoteToken.toString()
                }
            }
        )
        if (!quoteToken) {
            throw new TokenNotFoundException(
                {
                    id: bot.quoteToken.toString()
                }
            )
        }
        const gasToken = this.primaryMemoryStorageService.tokenCollection.findOne(
            {
                type: {
                    $eq: TokenType.Native
                },
                chainId: {
                    $eq: bot.chainId
                }
            }
        )
        if (!gasToken) {
            throw new TokenNotFoundException(
                {
                    conditions: {
                        type: TokenType.Native,
                        chainId: bot.chainId
                    }
                }
            )
        }
        // convert swap steps to token inputs
        const tokenInputs: Array<BalanceReconcileBalanceTokenInput> = []
        for (const swapStep of swapSteps) {
            const { direction, usedAmount } = swapStep
            switch (direction) {
            case SwapDirection.TargetToQuote: {
                tokenInputs.push({
                    tokenIn: targetToken,
                    tokenOut: quoteToken,
                    amount: usedAmount,
                })
                break
            }
            case SwapDirection.QuoteToTarget: {
                tokenInputs.push({
                    tokenIn: quoteToken,
                    tokenOut: targetToken,
                    amount: usedAmount,
                })
                break
            }
            case SwapDirection.TargetToGas: {
                tokenInputs.push({
                    tokenIn: targetToken,
                    tokenOut: gasToken,
                    amount: usedAmount,
                })
                break
            }
            case SwapDirection.QuoteToGas: {
                tokenInputs.push({
                    tokenIn: quoteToken,
                    tokenOut: gasToken,
                    amount: usedAmount,
                })
                break
            }
            }
        }
        // prepare swap transactions
        const [
            prepareResult,
            error
        ] = await this.asyncService.resolveTuple(
            this.balanceActionService.prepareReconcileBalanceTransaction(
                {
                    bot,
                    tokenInputs,
                }
            )
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
        // persist job: PENDING → PREPARED
        const balanceAmounts: BalanceAmounts = {
            targetBalanceAmount: targetBalanceAmountBN.toString(),
            quoteBalanceAmount: quoteBalanceAmountBN.toString(),
            gasBalanceAmount: gasBalanceAmountBN.toString(),
        }
        const data = this.serializerService.serialize<Partial<ReconcileBalanceJobData>>({
            prepareResult,
            logging: {
                quoteRatioResult,
                balanceAmounts,
            },
        })
        await this.connection.model<JobSchema>(JobSchema.name).updateOne(
            {
                _id: {
                    $eq: job._id,
                },
            },
            {
                $set: {
                    status: JobStatus.Prepared,
                    ...data,
                },
            }
        )

        this.winstonService.log(
            WinstonLog.ReconcileBalanceJobPrepared,
            {
                botId: bot.id,
                jobId: job.id,
                txHashes: prepareResult.prepareTxs.map((prepareTx) => prepareTx.txHash),
                quoteRatioResult,
                balanceAmounts,
            }
        )
        // return execution plan to next phase
        return {
            data: {
                prepareResult,
            }
        }
    }
}