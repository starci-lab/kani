import {
    Injectable,
} from "@nestjs/common"
import {
    toDecimalAmount,
    TokenType,
    toRawAmount,
} from "@modules/common"
import {
    PriceService,
} from "../math"
import Decimal from "decimal.js"
import {
    ConvertSingleAmountToTargetParams,
    ConvertSingleAmountToTargetResult,
    ConvertSingleAmountDecimalToTargetParams,
    ConvertToTargetParams,
    ConvertToTargetResult,
} from "./types"
import {
    PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    TokenNotFoundException 
} from "@modules/exceptions"
import BN from "bn.js"
import {
    AsyncService 
} from "@modules/mixin"

/**
 * Service responsible for converting balance amounts to target token value.
 * Uses token decimals and relative price (target/from) to express any balance in target terms.
 *
 * @example
 * const result = await service.convertToTarget({ amount, fromToken, targetToken })
 */
@Injectable()
export class BalanceConvertService {
    constructor(
        private readonly priceService: PriceService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
    ) {}

    /**
     * Converts a balance amount from one token to the equivalent value in the target token.
     *
     * @param param - Parameters: amount (raw BN), fromToken, targetToken
     * @returns Amount in target token (decimal and raw)
     *
     * @example
     * const { amountInTarget, amountInTargetRaw } = await service.convertSingleAmountToTarget({
     *   amount: new BN('1000000'),
     *   fromToken: quoteToken,
     *   targetToken,
     * })
     */
    async convertSingleAmountToTarget(
        {
            amount,
            fromToken,
            targetToken,
        }: ConvertSingleAmountToTargetParams
    ): Promise<ConvertSingleAmountToTargetResult> {
        const fromDecimals = new Decimal(fromToken.decimals)
        const targetDecimals = new Decimal(targetToken.decimals)

        const amountDecimal = toDecimalAmount({
            amount,
            decimals: fromDecimals,
        })

        if (fromToken.id.toString() === targetToken.id.toString()) {
            const amountInTargetRaw = amount
            return {
                amountInTarget: amountDecimal,
                amountInTargetRaw,
            }
        }

        const { price: relativePrice } = await this.priceService.resolveRelativePrice({
            tokenA: targetToken,
            tokenB: fromToken,
        })
        const amountInTarget = amountDecimal.div(relativePrice)
        const amountInTargetRaw = toRawAmount({
            amount: amountInTarget,
            decimals: targetDecimals,
        })

        return {
            amountInTarget,
            amountInTargetRaw,
        }
    }

    /**
     * Converts a balance amount from one token to the equivalent value in the target token.
     *
     * @param param - Parameters: amount (decimal), fromToken, targetToken
     * @returns Amount in target token (decimal and raw)
     *
     * @example
     * const { amountInTarget, amountInTargetRaw } = await service.convertSingleAmountDecimalToTarget({
     *   amount: new Decimal('1000000'),
     *   fromToken: quoteToken,
     *   targetToken,
     * })
     */
    async convertSingleAmountDecimalToTarget(
        {
            amount,
            fromToken,
            targetToken,
        }: ConvertSingleAmountDecimalToTargetParams
    ): Promise<ConvertSingleAmountToTargetResult> {
        console.log("amount",
            toRawAmount(
                {
                    amount,
                    decimals: new Decimal(fromToken.decimals),
                }
            ).toString())
        // we convert the amount to raw amount
        return this.convertSingleAmountToTarget(
            {
                amount: toRawAmount(
                    {
                        amount,
                        decimals: new Decimal(fromToken.decimals),
                    }
                ),
                fromToken,
                targetToken,
            }
        )
    }

    /**
     * Converts a bot's balance to the equivalent value in the target token.
     *
     * @param param - Parameters: bot
     * @returns Amount in target token (decimal and raw)
     *
     * @example
     * const { amountInTarget, amountInTargetRaw } = await service.convertToTarget({ bot })
     * console.log(amountInTarget.toString(), amountInTargetRaw.toString())
     */
    async convertToTarget({
        bot,
    }: ConvertToTargetParams): Promise<ConvertToTargetResult> {
        const targetToken = this.primaryMemoryStorageService.tokenMap.get(bot.targetToken.toString())
        if (!targetToken) {
            throw new TokenNotFoundException({
                id: bot.targetToken.toString(),
            })
        }
        const quoteToken = this.primaryMemoryStorageService.tokenMap.get(bot.quoteToken.toString())
        if (!quoteToken) {
            throw new TokenNotFoundException({
                id: bot.quoteToken.toString(),
            })
        }
        const gasToken = Array.from(this.primaryMemoryStorageService.tokenMap.values()).find(
            (t) => t.type === TokenType.Native && t.chainId === bot.chainId,
        )
        if (!gasToken) {
            throw new TokenNotFoundException({
                conditions: {
                    type: TokenType.Native,
                    chainId: bot.chainId,
                },
            })
        }
        const [
            convertedTargetBalanceAmount, 
            convertedQuoteBalanceAmount, 
            convertedGasBalanceAmount
        ] = await this.asyncService.allMustDone(
            [
                this.convertSingleAmountToTarget({
                    amount: bot.balanceSnapshots?.targetBalanceAmount ? new BN(bot.balanceSnapshots.targetBalanceAmount) : new BN(0),
                    fromToken: targetToken,
                    targetToken: targetToken,
                }),
                this.convertSingleAmountToTarget({
                    amount: bot.balanceSnapshots?.quoteBalanceAmount ? new BN(bot.balanceSnapshots.quoteBalanceAmount) : new BN(0),
                    fromToken: quoteToken,
                    targetToken: targetToken,
                }),
                this.convertSingleAmountToTarget({
                    amount: bot.balanceSnapshots?.gasBalanceAmount ? new BN(bot.balanceSnapshots.gasBalanceAmount) : new BN(0),
                    fromToken: gasToken,
                    targetToken: targetToken,
                }),
            ]
        )
        return {
            totalAmountInTarget: convertedTargetBalanceAmount.amountInTarget.add(convertedQuoteBalanceAmount.amountInTarget).add(convertedGasBalanceAmount.amountInTarget),
            totalAmountInTargetRaw: convertedTargetBalanceAmount.amountInTargetRaw.add(convertedQuoteBalanceAmount.amountInTargetRaw).add(convertedGasBalanceAmount.amountInTargetRaw),
            quoteAmountInTarget: convertedQuoteBalanceAmount.amountInTarget,
            quoteAmountInTargetRaw: convertedQuoteBalanceAmount.amountInTargetRaw,
            gasAmountInTarget: convertedGasBalanceAmount.amountInTarget,
            gasAmountInTargetRaw: convertedGasBalanceAmount.amountInTargetRaw,
            targetAmountInTarget: convertedTargetBalanceAmount.amountInTarget,
            targetAmountInTargetRaw: convertedTargetBalanceAmount.amountInTargetRaw,
        }
    }
}
