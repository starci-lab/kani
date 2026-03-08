import { 
    TargetOperationalGasAmountNotFoundException, 
    MinOperationalGasAmountNotFoundException,
    SwapAmountGasNotFoundException,
} from "@modules/exceptions"
import {
    QuoteRatioStatus,
} from "@modules/databases"
import {
    MountStorageService,
} from "@modules/filesystem"
import {
    Injectable 
} from "@nestjs/common"
import {
    Decimal 
} from "decimal.js"
import {
    bnDivDecimal,
    pow10, 
    toDecimalAmount, 
    toRawAmount, 
} from "@modules/common"
import {
    TokenType 
} from "@modules/common"
import BN from "bn.js"
import {
    QuoteRatioService 
} from "./quote-ratio.service"
import {
    envConfig 
} from "@modules/env"
import {
    PriceService 
} from "./price.service"
import {
    ComputeSwapAmountsParams,
    ComputeSwapAmountsResult,
    ExtendedComputeSwapAmountsParams,
    SwapDirection,
    SwapStep,
    ComputeAmountOutByPriceParams,
    RebalanceDirection,
    ComputeRebalanceAmountParams,
    ComputeRebalanceAmountResult
} from "./types"
import {
    GasStatus 
} from "../enums"

/**
 * Service responsible for computing swap amounts and strategies.
 * Handles swap calculations for rebalancing portfolios and managing gas balances.
 * Supports different scenarios based on which token is the gas token.
 *
 * @example
 * const service = new SwapMathService(...)
 * const result = await service.computeSwapAmounts({ targetToken, quoteToken, gasToken, targetBalanceAmount, quoteBalanceAmount, gasBalanceAmount })
 */
@Injectable()
export class SwapMathService {
    constructor(
        private readonly mountStorageService: MountStorageService,
        private readonly quoteRatioService: QuoteRatioService,
        private readonly priceService: PriceService,
    ) {}

    /**
     * Computes swap amounts when target token is the gas token.
     * 
     * Since target is gas, we don't need to swap for gas.
     * We only need to rebalance between target (gas) and quote tokens.
     * 
     * Strategy:
     * - If ratio is good: no swaps needed
     * - If target is overweighted: swap target to quote to reduce target exposure
     * - If target is underweighted: swap quote to target to increase target exposure
     * 
     * @param params - Extended parameters including tokens, balances, and quote ratio result
     * @returns Swap steps to execute in order (no gas swaps needed)
     */
    private async computeSwapAmountsWhenTargetIsGas(
        {
            targetToken,
            quoteToken,
            quoteRatioResult,
            targetBalanceAmount,
            quoteBalanceAmount,
        }: ExtendedComputeSwapAmountsParams
    ): Promise<ComputeSwapAmountsResult> {
        // Step 1: Check the current quote ratio status
        // This determines if we need to rebalance between target (gas) and quote tokens
        const quoteRatioStatus = this.quoteRatioService.checkQuoteRatioStatus({
            quoteRatio: quoteRatioResult.quoteRatio,
        })

        // Step 2: Handle different quote ratio statuses
        // Since target is gas, we only rebalance, no gas swaps needed
        switch (quoteRatioStatus) {
        case QuoteRatioStatus.Good: {
            // Case: Ratio is good, no swaps needed
            // Target (gas) and quote are already in balance
            return {
                swapSteps: [],
                quoteRatioResult,
            }
        }

        case QuoteRatioStatus.TargetOverweighted: {
            // Case: Target (gas) is overweighted (too much target, too little quote)
            // Strategy: Swap target to quote to reduce target exposure
            const swapSteps: Array<SwapStep> = []

            // Compute how much target to swap to quote to reach target ratio
            const { swappedAmount, usedAmount } = this.computeRebalanceAmount(
                {
                    amount: targetBalanceAmount,
                    currentRatio: quoteRatioResult.quoteRatio,
                    targetRatio: new Decimal(envConfig().quote.ratio.expected.above),
                    targetToken,
                    quoteToken,
                    direction: RebalanceDirection.TargetToQuote,
                    relativePrice: quoteRatioResult.relativePrice,
                }
            )
            swapSteps.push({
                direction: SwapDirection.TargetToQuote,
                usedAmount: usedAmount,
                swappedAmount: swappedAmount,
            })
            return {
                swapSteps,
                quoteRatioResult,
            }
        }

        case QuoteRatioStatus.TargetUnderweighted: {
            // Case: Target (gas) is underweighted (too little target, too much quote)
            // Strategy: Swap quote to target to increase target exposure
            const swapSteps: Array<SwapStep> = []

            // Compute how much quote to swap to target to reach target ratio
            const { swappedAmount, usedAmount } = this.computeRebalanceAmount(
                {
                    amount: quoteBalanceAmount,
                    currentRatio: quoteRatioResult.quoteRatio,
                    targetRatio: new Decimal(envConfig().quote.ratio.expected.below),
                    targetToken,
                    quoteToken,
                    direction: RebalanceDirection.QuoteToTarget,
                    relativePrice: quoteRatioResult.relativePrice,
                }
            )
            swapSteps.push(
                {
                    direction: SwapDirection.QuoteToTarget,
                    usedAmount: usedAmount,
                    swappedAmount: swappedAmount,
                }
            )
            return {
                swapSteps,
                quoteRatioResult,
            }
        }
        }
    }

    /**
     * Computes swap amounts when quote token is the gas token.
     * 
     * Since quote is gas, we don't need to swap for gas.
     * We only need to rebalance between target and quote (gas) tokens.
     * 
     * Strategy:
     * - If ratio is good: no swaps needed
     * - If target is overweighted: swap target to quote to reduce target exposure
     * - If target is underweighted: swap quote to target to increase target exposure
     * 
     * @param params - Extended parameters including tokens, balances, and quote ratio result
     * @returns Swap steps to execute in order (no gas swaps needed)
     */
    private async computeSwapAmountsWhenQuoteIsGas(
        {
            targetToken,
            quoteToken,
            quoteRatioResult,
            targetBalanceAmount,
            quoteBalanceAmount,
        }: ExtendedComputeSwapAmountsParams
    ): Promise<ComputeSwapAmountsResult> {
        // Step 1: Check the current quote ratio status
        // This determines if we need to rebalance between target and quote (gas) tokens
        const quoteRatioStatus = this.quoteRatioService.checkQuoteRatioStatus({
            quoteRatio: quoteRatioResult.quoteRatio,
        })

        // Step 2: Handle different quote ratio statuses
        // Since quote is gas, we only rebalance, no gas swaps needed
        switch (quoteRatioStatus) {
        case QuoteRatioStatus.Good: {
            // Case: Ratio is good, no swaps needed
            // Target and quote (gas) are already in balance
            return {
                swapSteps: [],
                quoteRatioResult,
            }
        }

        case QuoteRatioStatus.TargetOverweighted: {
            // Case: Target is overweighted (too much target, too little quote/gas)
            // Strategy: Swap target to quote to reduce target exposure
            const swapSteps: Array<SwapStep> = []

            // Compute how much target to swap to quote to reach target ratio
            const { swappedAmount, usedAmount } = this.computeRebalanceAmount(
                {
                    amount: targetBalanceAmount,
                    currentRatio: quoteRatioResult.quoteRatio,
                    targetRatio: new Decimal(envConfig().quote.ratio.expected.below),
                    targetToken,
                    quoteToken,
                    direction: RebalanceDirection.TargetToQuote,
                    relativePrice: quoteRatioResult.relativePrice,
                }
            )

            swapSteps.push({
                direction: SwapDirection.TargetToQuote,
                usedAmount: usedAmount,
                swappedAmount: swappedAmount,
            })

            return {
                swapSteps,
                quoteRatioResult,
            }
        }

        case QuoteRatioStatus.TargetUnderweighted: {
            // Case: Target is underweighted (too little target, too much quote/gas)
            // Strategy: Swap quote to target to increase target exposure
            const swapSteps: Array<SwapStep> = []
            // Compute how much quote to swap to target to reach target ratio
            const { swappedAmount, usedAmount } = this.computeRebalanceAmount(
                {
                    amount: quoteBalanceAmount,
                    currentRatio: quoteRatioResult.quoteRatio,
                    targetRatio: new Decimal(envConfig().quote.ratio.expected.below),
                    targetToken,
                    quoteToken,
                    direction: RebalanceDirection.QuoteToTarget,
                    relativePrice: quoteRatioResult.relativePrice,
                }
            )
            swapSteps.push({
                direction: SwapDirection.QuoteToTarget,
                usedAmount: usedAmount,
                swappedAmount: swappedAmount,
            })
            return {
                swapSteps,
                quoteRatioResult,
            }
        }
        }
    }

    /**
     * Computes swap amounts when neither target token nor quote token is the gas token.
     * 
     * This function handles the most complex case where we need to:
     * 1. Ensure sufficient gas balance for operations
     * 2. Rebalance the portfolio ratio between target and quote tokens
     * 
     * Strategy:
     * - If gas is insufficient, swap from the token that has excess (based on ratio)
     * - If ratio is imbalanced, rebalance by swapping between target and quote
     * - When both conditions exist, handle gas swap first, then rebalance with remaining balance
     * 
     * @param params - Extended parameters including tokens, balances, and quote ratio result
     * @returns Swap steps to execute in order
     */
    private async computeSwapAmountsWhenNeitherTargetNorQuoteIsGas(
        {
            targetToken,
            quoteToken,
            gasToken,
            gasBalanceAmount,
            quoteRatioResult,
            targetBalanceAmount,
            quoteBalanceAmount,
        }: ExtendedComputeSwapAmountsParams
    ): Promise<ComputeSwapAmountsResult> {
        // Step 1: Check the current quote ratio status
        // This determines if we need to rebalance between target and quote tokens
        const quoteRatioStatus = this.quoteRatioService.checkQuoteRatioStatus(
            {
                quoteRatio: quoteRatioResult.quoteRatio,
            }
        )

        // Step 2: Retrieve gas configuration for this chain
        // These values define the minimum and target gas amounts required for operations
        const {
            minOperationalAmount: minOperationalGasAmount,
            targetOperationalAmount: targetOperationalGasAmount,
            swapAmount: swapGasAmount,
        } = this.mountStorageService.appConfig.gas.gasAmountRequired?.[gasToken.chainId] ?? {
        }

        // Step 3: Validate that all required gas config values are present
        // Missing config would prevent proper gas management
        if (!minOperationalGasAmount) {
            throw new MinOperationalGasAmountNotFoundException(
                {
                    chainId: gasToken.chainId,
                }
            )
        }
        if (!targetOperationalGasAmount) {
            throw new TargetOperationalGasAmountNotFoundException(
                {
                    chainId: gasToken.chainId,
                }
            )
        }
        if (!swapGasAmount) {
            throw new SwapAmountGasNotFoundException(
                {
                    chainId: gasToken.chainId,
                }
            )
        }

        // Step 4: Convert gas amounts from human-readable to raw amounts (with decimals)
        // This ensures we work with the correct precision for blockchain operations
        const targetOperationalGasAmountBN = toRawAmount(
            {
                amount: new Decimal(targetOperationalGasAmount),
                decimals: new Decimal(gasToken.decimals),
            }
        )
        const swapGasAmountBN = toRawAmount(
            {
                amount: new Decimal(swapGasAmount),
                decimals: new Decimal(gasToken.decimals),
            }
        )

        // Step 5: Determine if we need to swap for gas
        // We need gas swap if current gas balance is below the target operational amount
        let needsGasSwap = false
        if (gasBalanceAmount.lt(targetOperationalGasAmountBN)) {
            needsGasSwap = true
        }

        // Step 6: Handle different quote ratio statuses
        switch (quoteRatioStatus) {
        case QuoteRatioStatus.Good: {
            // Case: Ratio is good, only need to ensure sufficient gas
            // No rebalancing needed between target and quote tokens
            
            // If gas is already sufficient, no swaps needed
            if (!needsGasSwap) {
                return {
                    swapSteps: [],
                    quoteRatioResult,
                }
            }

            // Gas is insufficient, need to swap from either target or quote to gas
            // Strategy: Swap from the token that has more value (higher ratio)
            // If target ratio > 0.5, we have more target, so swap target to gas
            // Otherwise, swap quote to gas
            const swapSteps: Array<SwapStep> = []
            
            if (quoteRatioResult.quoteRatio.gt(0.5)) {
                // Target token has more than 50% of portfolio value
                // Swap from target to gas to maintain better balance
                const { price: targetToGasRelativePrice } = await this.priceService.resolveRelativePrice({
                    tokenA: targetToken,
                    tokenB: gasToken,
                })
                
                // Calculate how much target token we need to swap to get the required gas
                const targetAmountForGasSwap = this.computeAmountOutByPrice(
                    {
                        amountIn: swapGasAmountBN,
                        tokenIn: gasToken,
                        tokenOut: targetToken,
                        relativePrice: targetToGasRelativePrice,
                    }
                ) 
                swapSteps.push(
                    {
                        direction: SwapDirection.TargetToGas,
                        usedAmount: targetAmountForGasSwap,
                        swappedAmount: swapGasAmountBN,
                    }
                )
            }
            else {
                // Quote token has more than 50% of portfolio value (or equal)
                // Swap from quote to gas to maintain better balance
                const { 
                    price: quoteToGasRelativePrice 
                } = await this.priceService.resolveRelativePrice(
                    {
                        tokenA: quoteToken,
                        tokenB: gasToken,
                    }
                )
                // Calculate how much quote token we need to swap to get the required gas
                const quoteAmountForGasSwap = this.computeAmountOutByPrice(
                    {
                        amountIn: swapGasAmountBN,
                        tokenIn: gasToken,
                        tokenOut: quoteToken,
                        relativePrice: quoteToGasRelativePrice,
                    }
                )             
                swapSteps.push(
                    {
                        direction: SwapDirection.QuoteToGas,
                        usedAmount: quoteAmountForGasSwap,
                        swappedAmount: swapGasAmountBN,
                    }
                )
            }
            
            return {
                swapSteps,
                quoteRatioResult,
            }
        }

        case QuoteRatioStatus.TargetUnderweighted: {
            // Case: Target token is underweighted (too little target, too much quote)
            // Strategy:
            // 1. If gas needed, swap from quote to gas (since we have excess quote)
            // 2. Then rebalance by swapping remaining quote to target
            
            const swapSteps: Array<SwapStep> = []
            let quoteAmountForGasSwap = new BN(0)

            // Step 6.1: Handle gas swap if needed
            // Since we have excess quote, swap quote to gas first
            if (needsGasSwap) {
                const { price: relativePrice } = await this.priceService.resolveRelativePrice({
                    tokenA: quoteToken,
                    tokenB: gasToken,
                })
                
                // Calculate how much quote token we need to swap to get the required gas
                quoteAmountForGasSwap = this.computeAmountOutByPrice(
                    {
                        amountIn: swapGasAmountBN,
                        tokenIn: gasToken,
                        tokenOut: quoteToken,
                        relativePrice,
                    }
                )
                
                swapSteps.push({
                    direction: SwapDirection.QuoteToGas,
                    usedAmount: quoteAmountForGasSwap,
                    swappedAmount: swapGasAmountBN,
                })
            }

            // Step 6.2: Rebalance by swapping remaining quote to target
            // Calculate remaining quote after gas swap
            const remainingQuoteAmount = quoteBalanceAmount.sub(quoteAmountForGasSwap)
            
            // Compute how much quote to swap to target to reach target ratio
            const { swappedAmount, usedAmount } = this.computeRebalanceAmount(
                {
                    amount: remainingQuoteAmount,
                    currentRatio: quoteRatioResult.quoteRatio,
                    targetRatio: new Decimal(envConfig().quote.ratio.expected.below),
                    targetToken,
                    quoteToken,
                    direction: RebalanceDirection.QuoteToTarget,
                    relativePrice: quoteRatioResult.relativePrice,
                }
            )
            
            swapSteps.push({
                direction: SwapDirection.QuoteToTarget,
                usedAmount: usedAmount,
                swappedAmount: swappedAmount,
            })
            
            return {
                swapSteps,
                quoteRatioResult,
            }
        }

        case QuoteRatioStatus.TargetOverweighted: {
            // Case: Target token is overweighted (too much target, too little quote)
            // Strategy:
            // 1. If gas needed, swap from target to gas (since we have excess target)
            // 2. Then rebalance by swapping remaining target to quote
            const swapSteps: Array<SwapStep> = []
            let targetAmountForGasSwap = new BN(0)

            // Step 6.1: Handle gas swap if needed
            // Since we have excess target, swap target to gas first
            if (needsGasSwap) {
                const { price: relativePrice } = await this.priceService.resolveRelativePrice({
                    tokenA: targetToken,
                    tokenB: gasToken,
                })
                
                // Calculate how much target token we need to swap to get the required gas
                targetAmountForGasSwap = this.computeAmountOutByPrice(
                    {
                        amountIn: swapGasAmountBN,
                        tokenIn: gasToken,
                        tokenOut: targetToken,
                        relativePrice,
                    }
                )
                
                swapSteps.push({
                    direction: SwapDirection.TargetToGas,
                    usedAmount: targetAmountForGasSwap,
                    swappedAmount: swapGasAmountBN,
                })
            }

            // Step 6.2: Rebalance by swapping remaining target to quote
            // Calculate remaining target after gas swap
            const remainingTargetAmount = targetBalanceAmount.sub(targetAmountForGasSwap)
            
            // Compute how much target to swap to quote to reach target ratio
            const { swappedAmount, usedAmount } = this.computeRebalanceAmount(
                {
                    amount: remainingTargetAmount,
                    currentRatio: quoteRatioResult.quoteRatio,
                    targetRatio: new Decimal(envConfig().quote.ratio.expected.above),
                    targetToken,
                    quoteToken,
                    direction: RebalanceDirection.TargetToQuote,
                    relativePrice: quoteRatioResult.relativePrice,
                }
            )
            
            swapSteps.push({
                direction: SwapDirection.TargetToQuote,
                usedAmount: usedAmount,
                swappedAmount: swappedAmount,
            })
            
            return {
                swapSteps,
                quoteRatioResult,
            }
        }
        }
    }

    /**
     * Computes swap amounts and steps for portfolio rebalancing and gas management.
     * Determines optimal swap strategy based on gas token type and quote ratio status.
     *
     * @param param - Parameters for computing swap amounts
     * @param param.targetToken - Target token schema
     * @param param.quoteToken - Quote token schema
     * @param param.gasToken - Gas token schema
     * @param param.targetBalanceAmount - Target token balance amount
     * @param param.quoteBalanceAmount - Quote token balance amount
     * @param param.gasBalanceAmount - Gas token balance amount
     * @returns Swap steps and quote ratio result
     *
     * @example
     * const result = await service.computeSwapAmounts({ targetToken, quoteToken, gasToken, targetBalanceAmount, quoteBalanceAmount, gasBalanceAmount })
     */
    public async computeSwapAmounts({
        targetToken,    
        quoteToken,
        gasToken,
        targetBalanceAmount,
        quoteBalanceAmount,
        gasBalanceAmount,
    }: ComputeSwapAmountsParams): Promise<ComputeSwapAmountsResult> {
        let gasStatus = GasStatus.IsGas
        if (targetToken.type === TokenType.Native) {
            gasStatus = GasStatus.IsTarget
        } else if (quoteToken.type === TokenType.Native) {
            gasStatus = GasStatus.IsQuote
        }
        const quoteRatioResult = await this.quoteRatioService.computeQuoteRatio(
            {
                targetToken,
                quoteToken,
                targetBalanceAmount,
                quoteBalanceAmount,
            }
        )
        // if stimulate, we return mock transactions
        if (envConfig().executor.runtime.operation.reconcileBalance.stimulate) {
            return {
                swapSteps: [
                    {
                        direction: SwapDirection.TargetToGas,
                        usedAmount: new BN(1000),
                        swappedAmount: new BN(1000),
                    },
                    {
                        direction: SwapDirection.TargetToQuote,
                        usedAmount: new BN(1000),
                        swappedAmount: new BN(1000),
                    },
                ],
                quoteRatioResult,
            }
        }
        switch (gasStatus) {
        case GasStatus.IsTarget: {
            return this.computeSwapAmountsWhenTargetIsGas({
                targetToken,
                quoteToken,
                gasToken,
                quoteRatioResult,
                targetBalanceAmount,
                quoteBalanceAmount,
                gasBalanceAmount,
            })
        }
        case GasStatus.IsQuote: {
            return this.computeSwapAmountsWhenQuoteIsGas({
                targetToken,
                quoteToken,
                gasToken,
                quoteRatioResult,
                targetBalanceAmount,
                quoteBalanceAmount,
                gasBalanceAmount,
            })
        }
        case GasStatus.IsGas: {
            return this.computeSwapAmountsWhenNeitherTargetNorQuoteIsGas({
                targetToken,
                quoteToken,
                gasToken,
                quoteRatioResult,
                targetBalanceAmount,
                quoteBalanceAmount,
                gasBalanceAmount,
            })
        }
        }
    }
    
    /**
     * Computes output amount from an input amount using a relative price.
     *
     * Formula:
     *   amountOut = amountIn / price × 10^outDecimals / 10^inDecimals
     *
     * Note:
     * - price must be denominated as tokenOut / tokenIn
     * - no AMM curve, no fee, no slippage
     *
     * @param param - Parameters for computing amount out
     * @param param.amountIn - Input amount
     * @param param.tokenIn - Input token schema
     * @param param.tokenOut - Output token schema
     * @param param.relativePrice - Relative price (tokenOut / tokenIn)
     * @returns Output amount in raw units
     */
    private computeAmountOutByPrice({
        amountIn,
        tokenIn,
        tokenOut,
        relativePrice,
    }: ComputeAmountOutByPriceParams): BN {
        return bnDivDecimal({
            bn: amountIn,
            decimal: relativePrice,
        })
            .mul(pow10({
                exponent: new Decimal(tokenOut.decimals),
                asBN: true,
            }))
            .div(pow10({
                exponent: new Decimal(tokenIn.decimals),
                asBN: true,
            }
            )
            )
    }

    /**
     * Computes how much token needs to be swapped to rebalance from currentRatio to targetRatio.
     *
     * Definitions:
     * - amount: amount of the token being swapped (raw amount, before decimal normalization)
     * - currentRatio: current target allocation ratio (target / total)
     * - targetRatio: desired target allocation ratio
     * - relativePrice: price of targetToken denominated in quoteToken
     *
     * @param param - Parameters for computing rebalance amount
     * @param param.amount - Amount of token being swapped
     * @param param.currentRatio - Current target allocation ratio
     * @param param.targetRatio - Desired target allocation ratio
     * @param param.targetToken - Target token schema
     * @param param.quoteToken - Quote token schema
     * @param param.direction - Rebalance direction
     * @param param.relativePrice - Relative price (targetToken / quoteToken)
     * @returns Rebalance amount result with swapped and used amounts
     */
    private computeRebalanceAmount({
        amount,
        currentRatio,
        targetRatio,
        targetToken,
        quoteToken,
        direction,
        relativePrice,
    }: ComputeRebalanceAmountParams): ComputeRebalanceAmountResult {
        /**
     * Case 1: Quote → Target (increase target exposure)
     *
     * current_ratio = T / (T + Q)
     * target_ratio  = (T + X) / (T + Q)
     *
     * where:
     * - T = amount_target
     * - Q = amount_quote_in_target
     * - X = target added (in target unit)
     */
        if (direction === RebalanceDirection.QuoteToTarget) {
        // Convert quote amount into target unit
            const amountQuoteInTarget = toDecimalAmount({
                amount,
                decimals: new Decimal(quoteToken.decimals),
            }).div(relativePrice)
            /**
         * Special case: no target yet
         *
         * target_ratio = X / Q
         * => X = target_ratio * Q
         */
            if (currentRatio.eq(0)) {
                const swappedAmount = targetRatio.mul(amountQuoteInTarget)
                const usedAmount = swappedAmount.mul(relativePrice)
                return {
                    swappedAmount: toRawAmount({
                        amount: swappedAmount,
                        decimals: new Decimal(targetToken.decimals),
                    }),
                    usedAmount: toRawAmount({
                        amount: usedAmount,
                        decimals: new Decimal(quoteToken.decimals),
                    }),
                }
            }
            const amountTarget = currentRatio
                .mul(amountQuoteInTarget)
                .div(new Decimal(1).sub(currentRatio))
            const swappedAmount = amountTarget
                .mul(targetRatio.div(currentRatio).sub(1))
            const usedAmount = swappedAmount.mul(relativePrice)
            return {
                swappedAmount: toRawAmount({
                    amount: swappedAmount,
                    decimals: new Decimal(targetToken.decimals),
                }),
                usedAmount: toRawAmount({
                    amount: usedAmount,
                    decimals: new Decimal(quoteToken.decimals),
                }),
            }
        }

        /**
     * Case 2: Target → Quote (decrease target exposure)
     *
     * current_ratio = T / (T + Q)
     * target_ratio  = (T - X) / (A + Q)
     *
     * => X = T * (current_ratio - target_ratio)
     */
        else {
            // Normalize target amount
            const amountTarget = toDecimalAmount({
                amount,
                decimals: new Decimal(targetToken.decimals),
            })

            const usedAmount = amountTarget
                .mul(currentRatio.sub(targetRatio))
            const swappedAmount = usedAmount.mul(relativePrice)
            return {
                swappedAmount: toRawAmount({
                    amount: swappedAmount,
                    decimals: new Decimal(
                        quoteToken.decimals
                    ),
                }),
                usedAmount: toRawAmount({
                    amount: usedAmount,
                    decimals: new Decimal(
                        targetToken.decimals
                    ),
                }),
            }
        }
    }
}
