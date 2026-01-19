import {
    Injectable 
} from "@nestjs/common"
import {
    FetchBalanceParams,
    FetchBalanceResult,
    FetchBalancesParams,
    FetchBalancesResult,
    IBalanceService,
    PrepareSwapTransactionParams,
    PrepareSwapTransactionResult,
    ExecuteSwapTransactionParams,
    EnqueueBalanceRebalancingParams,
    DetermineReconcileBalancePlanParams,
    DetermineReconcileBalancePlanResult,
} from "./balance.interface"
import {
    SolanaBalanceService 
} from "./solana.service"
import {
    TokenType, ChainId 
} from "@modules/typedefs"
import {
    SuiBalanceService 
} from "./sui.service"
import { 
    JobType, 
    JobStatus, 
    PrimaryMemoryStorageService, 
    InjectPrimaryMongoose, 
    JobSchema, 
} from "@modules/databases"
import {
    TargetOperationalGasAmountNotFoundException,
    TokenNotFoundException,
    MinOperationalGasAmountNotFoundException,
    UnsupportedChainIdException,
} from "@modules/exceptions"
import {
    GasStatusService 
} from "./gas-status.service"
import {
    GasStatus 
} from "../types"
import BN from "bn.js"
import {
    SwapMathService 
} from "../math"
import {
    computeDenomination 
} from "@modules/utils"
import Decimal from "decimal.js"
import {
    v4 
} from "uuid"
import {
    envConfig 
} from "@modules/env"
import {
    Connection 
} from "mongoose"
import {
    Queue 
} from "bullmq"
import {
    bullData, BullQueueName 
} from "@modules/bullmq"
import {
    ReconcileBalancePayload 
} from "../types"
import {
    InjectQueue 
} from "@nestjs/bullmq"
import {
    WinstonService, WinstonLog 
} from "@modules/winston"
import {
    AsyncService,
} from "@modules/mixin"


@Injectable()
export class BalanceService implements IBalanceService {
    constructor(
    private readonly solanaBalanceService: SolanaBalanceService,
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly suiBalanceService: SuiBalanceService,
    private readonly gasStatusService: GasStatusService,
    private readonly swapMathService: SwapMathService,
    @InjectPrimaryMongoose()
    private readonly connection: Connection,
    @InjectQueue(bullData[BullQueueName.ReconcileBalance].name)
    private readonly reconcileBalanceQueue: Queue<ReconcileBalancePayload>,
    private readonly winstonService: WinstonService,
    private readonly asyncService: AsyncService,
    ) {}

    async enqueue(
        {
            bot,
        }: EnqueueBalanceRebalancingParams,
    ) {
        /**
         * Retrieve sema to prevent concurrent actions on the same bot
         */
        const lease = this.leaseService.lease(
            getLeaseKey(LeaseKey.Action,
                bot.id),
        )
        // if the sema is locked, skip the execution
        if (lease.isLocked()) {
            // there is a job already running for this bot
            return
        }
        /**
         * Safety check, if the active position is set, return only
         */
        if (bot.activePosition
            || bot.activePositionLiquidityPool
            || bot.activePositionLiquidityPoolType
        ) {
            return
        }
        // try to lock the lease
        const leaseId = v4()
        lease.tryLock(leaseId)
        /**
         * Add reconcile balance job to the queue
         */
        const session = await this.connection.startSession()
        try {
            await session.withTransaction(async () => {
                /**
                 * Persist job record.
                 */
                const [ jobRaw ] = await this.connection.model<JobSchema>(
                    JobSchema.name
                ).create(
                    [
                        {
                            bot: bot.id,
                            type: JobType.ReconcileBalance,
                            status: JobStatus.Pending,
                            executor: envConfig().executor.id,
                            leaseId,
                        }
                    ])
                /**
                * Add reconcile balance job to the queue
                */
                await this.reconcileBalanceQueue.add(
                    v4(),
                    {
                        jobId: jobRaw.toJSON().id,
                        leaseId,
                        bot,
                    }
                )
                /**
                * Structured logging for observability.
                */
                this.logger.verbose(
                    WinstonLog.ReconcileBalanceEnqueued,
                    {
                        botId: bot.id,
                    }
                )
            }
            )
        } catch (error) {
            // unlock the lease if the job is not enqueued
            lease.unlock(leaseId)
            // log the error
            this.logger.error(
                WinstonLog.ReconcileBalanceEnqueueFailed,
                {
                    botId: bot.id,
                    error: error.message,
                }
            )
        }
    }   

    async determineReconcileBalancePlan({
        bot,
        snapshotTargetBalanceAmount,
        snapshotQuoteBalanceAmount,
        snapshotGasBalanceAmount,
    }: DetermineReconcileBalancePlanParams): Promise<DetermineReconcileBalancePlanResult> {
        const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: bot.targetToken
            }
        })
        if (!targetToken) {
            throw new TokenNotFoundException({
                id: bot.targetToken.toString(),
            })
        }   
        const quoteToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: bot.quoteToken
            }
        })
        if (!quoteToken) {
            throw new TokenNotFoundException({
                id: bot.quoteToken.toString(),
            })
        }   
        // if you pass the snapshot balances, we will use them instead of fetching the balances from on-chain
        let targetBalanceAmount: BN
        let quoteBalanceAmount: BN
        let gasBalanceAmount: BN
        if (
            snapshotTargetBalanceAmount &&
            snapshotQuoteBalanceAmount &&
            snapshotGasBalanceAmount
        ) {
            targetBalanceAmount = snapshotTargetBalanceAmount
            quoteBalanceAmount = snapshotQuoteBalanceAmount
            gasBalanceAmount = snapshotGasBalanceAmount
        } else {
            const {
                targetBalanceAmount: fetchedTargetBalanceAmount,
                quoteBalanceAmount: fetchedQuoteBalanceAmount,
                gasBalanceAmount: fetchedGasBalanceAmount,
            } = await this.fetchBalances(
                {
                    bot,
                }
            )
            targetBalanceAmount = fetchedTargetBalanceAmount
            quoteBalanceAmount = fetchedQuoteBalanceAmount
            gasBalanceAmount = fetchedGasBalanceAmount
        }
        const {
            processSwaps,
            swapTargetToQuoteAmount,
            swapQuoteToTargetAmount,
            estimatedSwappedTargetAmount,
            estimatedSwappedQuoteAmount,
            quoteRatioResult,
        } = await this.swapMathService.computeSwapAmounts(
            {
                targetTokenId: targetToken.displayId,
                quoteTokenId: quoteToken.displayId,
                targetBalanceAmount,
                quoteBalanceAmount,
                gasBalanceAmount
            }
        )
        if (!processSwaps) {
            // just snapshot the balances and return
            return {
                needsSwap: false,
                needsSnapshot: true,
            }
        }
        const targetBalanceAmountInTarget = computeDenomination(
            targetBalanceAmount,
            targetToken.decimals,
        )
        const quoteBalanceAmountInTarget = computeDenomination(
            quoteBalanceAmount,
            quoteToken.decimals,
        ).div(quoteRatioResult.relativePrice)
        const totalBalanceAmountInTarget = targetBalanceAmountInTarget.add(
            quoteBalanceAmountInTarget,
        )
        if (
            totalBalanceAmountInTarget.lt(
                new Decimal(targetToken.minSwapAmount || 0),
            )
        ) {
            // snapshot the balances and return, since the balance is not enough to swap
            return {
                needsSwap: false,
                needsSnapshot: true,
            }
        }
        if (swapTargetToQuoteAmount) {
            if (!estimatedSwappedQuoteAmount) {
                throw new EstimatedSwappedQuoteAmountNotFoundException(
                    "Estimated swapped quote amount not found",
                )
            }       
            return {
                needsSwap: true,
                needsSnapshot: true,
                tokenIn: targetToken,
                tokenOut: quoteToken,
                amountIn: swapTargetToQuoteAmount,
                estimatedSwappedAmount: estimatedSwappedQuoteAmount,
            }
        }
        if (swapQuoteToTargetAmount) {
            if (!estimatedSwappedTargetAmount) {
                throw new EstimatedSwappedTargetAmountNotFoundException(
                    "Estimated swapped target amount not found",
                )
            }
            return {
                needsSwap: true,
                needsSnapshot: false,
                tokenIn: quoteToken,
                tokenOut: targetToken,
                amountIn: swapQuoteToTargetAmount,
                estimatedSwappedAmount: estimatedSwappedTargetAmount,
            }
        }
        return {
            needsSwap: false,
            needsSnapshot: true,
        }
    }

    async prepareSwapTransaction(
        params: PrepareSwapTransactionParams,
    ): Promise<PrepareSwapTransactionResult> {
        switch (params.bot.chainId) {
        case ChainId.Solana:
            return this.solanaBalanceService.prepareSwapTransaction(params)
        case ChainId.Sui:
            return this.suiBalanceService.prepareSwapTransaction(params)
        default:
            throw new Error(`Unsupported chain id: ${params.bot.chainId}`)
        }
    }

    async executeSwapTransaction(
        params: ExecuteSwapTransactionParams,
    ): Promise<void> {
        switch (params.bot.chainId) {
        case ChainId.Solana:
            return this.solanaBalanceService.executeSwapTransaction(params)
        case ChainId.Sui:
            return this.suiBalanceService.executeSwapTransaction(params)
        default:
            throw new Error(`Unsupported chain id: ${params.bot.chainId}`)
        }
    }

    public async fetchBalances({
        bot,
    }: FetchBalancesParams): Promise<FetchBalancesResult> {
        const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: bot.targetToken
            }
        })
        if (!targetToken) {
            throw new TokenNotFoundException({
                id: bot.targetToken.toString(),
            })
        }
        const quoteToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: bot.quoteToken
            }
        })
        if (!quoteToken) {
            throw new TokenNotFoundException({
                id: bot.quoteToken.toString(),
            })
        }
        const { balanceAmount: targetBalanceAmount } = await this.fetchBalance({
            bot,
            tokenId: targetToken.displayId,
        })
        const { balanceAmount: quoteBalanceAmount } = await this.fetchBalance({
            bot,
            tokenId: quoteToken.displayId,
        })
        const gasStatus = this.gasStatusService.getGasStatus({
            targetTokenId: targetToken.displayId,
            quoteTokenId: quoteToken.displayId,
        })
        const targetOperationalGasAmount =
      this.primaryMemoryStorageService.gasConfig.gasAmountRequired?.[bot.chainId]
          ?.targetOperationalAmount
        if (!targetOperationalGasAmount) {
            throw new TargetOperationalGasAmountNotFoundException(
                {
                    chainId: bot.chainId,
                }
            )
        }
        const minOperationalGasAmount =
      this.primaryMemoryStorageService.gasConfig.gasAmountRequired?.[bot.chainId]
          ?.minOperationalAmount
        if (!minOperationalGasAmount) {
            throw new MinOperationalGasAmountNotFoundException(
                {
                    chainId: bot.chainId,
                }
            )
        }
        const targetOperationalGasAmountBN = new BN(targetOperationalGasAmount)
        const minOperationalGasAmountBN = new BN(minOperationalGasAmount)
        switch (gasStatus) {
        case GasStatus.IsTarget: {
        // we use the possible maximum amount of gas that can be used
            const effectiveGasAmountBN = BN.min(
                targetOperationalGasAmountBN,
                targetBalanceAmount,
            )
            if (effectiveGasAmountBN.lt(minOperationalGasAmountBN)) {
                throw new InsufficientMinGasBalanceAmountException(
                    {
                        chainId: bot.chainId,
                    }
                )
            }
            const targetBalanceAmountAfterDeductingGas =
          targetBalanceAmount.sub(effectiveGasAmountBN)
            return {
                targetBalanceAmount: targetBalanceAmountAfterDeductingGas,
                quoteBalanceAmount,
                gasBalanceAmount: effectiveGasAmountBN,
            }
        }
        case GasStatus.IsQuote: {
            const quoteBalanceAmountAfterDeductingGas = quoteBalanceAmount.sub(
                targetOperationalGasAmountBN,
            )
            return {
                targetBalanceAmount,
                quoteBalanceAmount: quoteBalanceAmountAfterDeductingGas,
                gasBalanceAmount: targetOperationalGasAmountBN,
            }
        }
        default: {
            const gasToken = this.primaryMemoryStorageService.tokenCollection.findOne({
                type: {
                    $eq: TokenType.Native
                },
                chainId: {
                    $eq: bot.chainId
                }
            })
            if (!gasToken) {
                throw new TokenNotFoundException({
                    conditions: {
                        chainId: bot.chainId,
                        type: TokenType.Native,
                    },
                })
            }
            const { balanceAmount: gasBalanceAmount } = await this.fetchBalance({
                bot,
                tokenId: gasToken.displayId,
            })
            return {
                targetBalanceAmount,
                quoteBalanceAmount,
                gasBalanceAmount,
            }
        }
        }
    }

    public async fetchBalance(
        params: FetchBalanceParams,
    ): Promise<FetchBalanceResult> {
        switch (params.bot.chainId) {
        case ChainId.Solana:
            return this.solanaBalanceService.fetchBalance(params)
        case ChainId.Sui:
            return this.suiBalanceService.fetchBalance(params)
        default:
            throw new UnsupportedChainIdException(
                params.bot.chainId,
            )
        }
    }
}
