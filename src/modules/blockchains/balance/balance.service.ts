import { Injectable } from "@nestjs/common"
import { 
    FetchBalanceParams, 
    FetchBalanceResponse, 
    FetchBalancesParams, 
    FetchBalancesResponse, 
    IBalanceService,
    ExecuteBalanceRebalancingResponse,
    ProcessSwapTransactionResponse,
    ProcessSwapTransactionParams,
} from "./balance.interface"
import { SolanaBalanceService } from "./solana.service"
import { ExecuteBalanceRebalancingParams } from "./balance.interface"
import { ChainId, TokenType } from "@modules/common"
import { SuiBalanceService } from "./sui.service"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { 
    InsufficientMinGasBalanceAmountException, 
    TargetOperationalGasAmountNotFoundException, 
    TokenNotFoundException,
    MinOperationalGasAmountNotFoundException,
    EstimatedSwappedTargetAmountNotFoundException,
    EstimatedSwappedQuoteAmountNotFoundException
} from "@exceptions"
import { GasStatusService } from "./gas-status.service"
import { GasStatus } from "../types"
import BN from "bn.js"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { InjectPrimaryMongoose } from "@modules/databases"
import { Connection as MongooseConnection } from "mongoose"
import { SwapMathService } from "../math"
import { 
    BalanceSnapshotService, 
    UpdateBotSnapshotBalancesRecordParams, 
    AddSwapTransactionRecordParams, 
    SwapTransactionSnapshotService
} from "../snapshots"
import { computeDenomination } from "@utils"
import Decimal from "decimal.js"
import { createEventName, EventName } from "@modules/event"

@Injectable()
export class BalanceService implements IBalanceService {
    constructor(
        private readonly solanaBalanceService: SolanaBalanceService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly suiBalanceService: SuiBalanceService,
        private readonly gasStatusService: GasStatusService,
        private readonly swapMathService: SwapMathService,
        private readonly balanceSnapshotService: BalanceSnapshotService,
        private readonly swapTransactionSnapshotService: SwapTransactionSnapshotService,
        private readonly eventEmitter: EventEmitter2,
        @InjectPrimaryMongoose()
        private readonly connection: MongooseConnection,
    ) {}

    async executeBalanceRebalancing(
        {
            bot,
            withoutSnapshot = false,
        }: ExecuteBalanceRebalancingParams
    ): Promise<ExecuteBalanceRebalancingResponse> {
        let balancesSnapshotsParams: UpdateBotSnapshotBalancesRecordParams | undefined
        let swapsSnapshotsParams: AddSwapTransactionRecordParams | undefined
        const targetToken = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === bot.targetToken.toString()
        )
        if (!targetToken) {
            throw new TokenNotFoundException("Target token not found")
        }
        const quoteToken = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === bot.quoteToken.toString()
        )
        if (!quoteToken) {
            throw new TokenNotFoundException("Quote token not found")
        }
        const { 
            targetBalanceAmount, 
            quoteBalanceAmount, 
            gasBalanceAmount, 
        } = await this.fetchBalances({
            bot,
        })
        const { 
            processSwaps,
            swapTargetToQuoteAmount, 
            swapQuoteToTargetAmount, 
            estimatedSwappedTargetAmount,
            estimatedSwappedQuoteAmount,
            quoteRatioResponse
        } = await this.swapMathService.computeSwapAmounts({
            targetTokenId: targetToken.displayId,
            quoteTokenId: quoteToken.displayId,
            targetBalanceAmount,
            quoteBalanceAmount,
            gasBalanceAmount,
        })
        if (!processSwaps) {
            // just snapshot the balances and return
            // ensure the balances are synced
            if (!withoutSnapshot) {
                await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                    bot,
                    targetBalanceAmount,
                    quoteBalanceAmount,
                    gasBalanceAmount,
                })
                this.eventEmitter.emit(
                    createEventName(
                        EventName.UpdateActiveBot, {
                            botId: bot.id,
                        }))
            }
            balancesSnapshotsParams = {
                bot,
                targetBalanceAmount,
                quoteBalanceAmount,
                gasBalanceAmount,
            }
            return {
                balancesSnapshotsParams,
            }
        }
        const targetBalanceAmountInTarget = computeDenomination(targetBalanceAmount, targetToken.decimals)
        const quoteBalanceAmountInTarget = computeDenomination(
            quoteBalanceAmount, 
            quoteToken.decimals
        ).div(quoteRatioResponse.oraclePrice)
        const totalBalanceAmountInTarget = targetBalanceAmountInTarget.add(quoteBalanceAmountInTarget)
        if (totalBalanceAmountInTarget.lt(new Decimal(targetToken.minRequiredAmountInTotal || 0))) {
            if (!withoutSnapshot) {
                await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                    bot,
                    targetBalanceAmount,
                    quoteBalanceAmount,
                    gasBalanceAmount,
                })
                this.eventEmitter.emit(
                    createEventName(
                        EventName.UpdateActiveBot, {
                            botId: bot.id,
                        }))
            }
            return {
                balancesSnapshotsParams: {
                    bot,
                    targetBalanceAmount,
                    quoteBalanceAmount,
                    gasBalanceAmount,
                },
            }
        }
        if (swapTargetToQuoteAmount) {
            if (!estimatedSwappedQuoteAmount) {
                throw new EstimatedSwappedQuoteAmountNotFoundException(
                    "Estimated swapped quote amount not found"
                )
            }
            const { txHash } = await this.processSwapTransaction({
                bot,
                tokenIn: targetToken,
                tokenOut: quoteToken,
                amountIn: swapTargetToQuoteAmount,
                estimatedSwappedAmount: estimatedSwappedQuoteAmount,
            })
            const {
                targetBalanceAmount: adjustedTargetBalanceAmount,
                quoteBalanceAmount: adjustedQuoteBalanceAmount,
                gasBalanceAmount: adjustedGasBalanceAmount,
            } = await this.fetchBalances({
                bot,
            })
            if (!withoutSnapshot) {
                const session = await this.connection.startSession()
                await session.withTransaction(
                    async () => {
                        await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                            bot,
                            targetBalanceAmount: adjustedTargetBalanceAmount,
                            quoteBalanceAmount: adjustedQuoteBalanceAmount,
                            gasBalanceAmount: adjustedGasBalanceAmount,
                            session,
                        })
                        await this.swapTransactionSnapshotService.addSwapTransactionRecord({
                            txHash,
                            tokenInId: targetToken.displayId,
                            tokenOutId: quoteToken.displayId,
                            amountIn: swapTargetToQuoteAmount,
                            bot,
                            session,
                        })
                    })
                this.eventEmitter.emit(
                    createEventName(
                        EventName.UpdateActiveBot, {
                            botId: bot.id,
                        }))
                balancesSnapshotsParams = {
                    bot,
                    targetBalanceAmount: adjustedTargetBalanceAmount,
                    quoteBalanceAmount: adjustedQuoteBalanceAmount,
                    gasBalanceAmount: adjustedGasBalanceAmount,
                }
                swapsSnapshotsParams = {
                    txHash,
                    amountIn: swapTargetToQuoteAmount,
                    tokenInId: targetToken.displayId,
                    tokenOutId: quoteToken.displayId,
                    bot,
                    session,
                }
            }
        }

        if (swapQuoteToTargetAmount) {
            if (!estimatedSwappedTargetAmount) {
                throw new EstimatedSwappedTargetAmountNotFoundException(
                    "Estimated swapped target amount not found"
                )
            }
            const { txHash } = await this.processSwapTransaction({
                bot,
                tokenIn: quoteToken,
                tokenOut: targetToken,
                amountIn: swapQuoteToTargetAmount,
                estimatedSwappedAmount: estimatedSwappedTargetAmount,
            })
            const {
                targetBalanceAmount: adjustedTargetBalanceAmount,
                quoteBalanceAmount: adjustedQuoteBalanceAmount,
                gasBalanceAmount: adjustedGasBalanceAmount,
            } = await this.fetchBalances({
                bot,
            })
            if (!withoutSnapshot) {
                const session = await this.connection.startSession()
                await session.withTransaction(
                    async () => {
                        await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                            bot,
                            targetBalanceAmount: adjustedTargetBalanceAmount,
                            quoteBalanceAmount: adjustedQuoteBalanceAmount,
                            gasBalanceAmount: adjustedGasBalanceAmount,
                            session,
                        })
                        await this.swapTransactionSnapshotService.addSwapTransactionRecord({
                            txHash,
                            tokenInId: targetToken.displayId,
                            tokenOutId: quoteToken.displayId,
                            amountIn: swapQuoteToTargetAmount,
                            bot,
                            session,
                        })
                    })
                this.eventEmitter.emit(
                    createEventName(
                        EventName.UpdateActiveBot, {
                            botId: bot.id,
                        }))
                balancesSnapshotsParams = {
                    bot,
                    targetBalanceAmount: adjustedTargetBalanceAmount,
                    quoteBalanceAmount: adjustedQuoteBalanceAmount,
                    gasBalanceAmount: adjustedGasBalanceAmount,
                }
                swapsSnapshotsParams = {
                    txHash,
                    amountIn: swapQuoteToTargetAmount,
                    tokenInId: quoteToken.displayId,
                    tokenOutId: targetToken.displayId,
                    bot,
                    session,
                }
            }
        }
        return {
            balancesSnapshotsParams: balancesSnapshotsParams,
            swapsSnapshotsParams: swapsSnapshotsParams,
        }
    }

    public async fetchBalances(
        {
            bot,
        }: FetchBalancesParams
    ): Promise<FetchBalancesResponse> {
        const chainId = ChainId.Solana
        const targetToken = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === bot.targetToken.toString()
        )
        if (!targetToken) {
            throw new TokenNotFoundException("Target token not found")
        }
        const quoteToken = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === bot.quoteToken.toString()
        )
        if (!quoteToken) {
            throw new TokenNotFoundException("Quote token not found")
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
        const targetOperationalGasAmount = this.primaryMemoryStorageService.gasConfig
            .gasAmountRequired?.[chainId]?.targetOperationalAmount
        if (!targetOperationalGasAmount) {
            throw new TargetOperationalGasAmountNotFoundException(
                chainId,
                "Target operational gas amount not found"
            )
        }
        const minOperationalGasAmount = this.primaryMemoryStorageService.gasConfig
            .gasAmountRequired?.[chainId]?.minOperationalAmount
        if (!minOperationalGasAmount) {
            throw new MinOperationalGasAmountNotFoundException(
                chainId,
                "Min operational gas amount not found"
            )
        }
        const targetOperationalGasAmountBN = new BN(targetOperationalGasAmount)
        const minOperationalGasAmountBN = new BN(minOperationalGasAmount)
        switch (gasStatus) {
        case GasStatus.IsTarget: {
            // we use the possible maximum amount of gas that can be used
            const effectiveGasAmountBN = BN.min(
                targetOperationalGasAmountBN, 
                targetBalanceAmount
            )
            if (
                effectiveGasAmountBN
                    .lt(minOperationalGasAmountBN)
            ) {
                throw new InsufficientMinGasBalanceAmountException(
                    chainId,
                    "Insufficient min gas balance amount"
                )
            }
            const targetBalanceAmountAfterDeductingGas = targetBalanceAmount.sub(effectiveGasAmountBN)
            return {
                targetBalanceAmount: targetBalanceAmountAfterDeductingGas,
                quoteBalanceAmount,
                gasBalanceAmount: effectiveGasAmountBN,
            }
        }
        case GasStatus.IsQuote: {
            const quoteBalanceAmountAfterDeductingGas = quoteBalanceAmount.sub(targetOperationalGasAmountBN)
            return {
                targetBalanceAmount,
                quoteBalanceAmount: quoteBalanceAmountAfterDeductingGas,
                gasBalanceAmount: targetOperationalGasAmountBN,
            }
        }
        default: {
            const gasToken = this.primaryMemoryStorageService.tokens.find(
                (token) => 
                    token.type === TokenType.Native 
                    && token.chainId === chainId
            )
            if (!gasToken) {
                throw new TokenNotFoundException("Gas token not found")
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
        params: FetchBalanceParams
    ): Promise<FetchBalanceResponse> {
        switch (params.bot.chainId) {
        case ChainId.Solana:
            return this.solanaBalanceService.fetchBalance(params)
        case ChainId.Sui:
            return this.suiBalanceService.fetchBalance(params)
        default:
            throw new Error(`Unsupported chain id: ${params.bot.chainId}`)
        }
    }

    public async processSwapTransaction(
        params: ProcessSwapTransactionParams
    ): Promise<ProcessSwapTransactionResponse> {
        switch (params.bot.chainId) {
        case ChainId.Solana:
            return this.solanaBalanceService.processSwapTransaction(params)
        case ChainId.Sui:
            return this.suiBalanceService.processSwapTransaction(params)
        default:
            throw new Error(`Unsupported chain id: ${params.bot.chainId}`)
        }
    }
}