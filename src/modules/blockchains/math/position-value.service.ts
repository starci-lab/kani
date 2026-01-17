import { Injectable } from "@nestjs/common"
import Decimal from "decimal.js"
import { PythOraclePriceService } from "../price-feeds/pyth"
import { BotSchema, PrimaryMemoryStorageService } from "@modules/databases"
import { TokenType } from "@typedefs"
import { TokenNotFoundException } from "@exceptions"
import { computeDenomination } from "@utils"
import { AsyncService } from "@modules/mixin"
import BN from "bn.js"
import { SpotPriceService } from "../spot"
import { DlmmLiquidityPoolState, LiquidityPoolState } from "../interfaces"

@Injectable()
export class PositionValueMathService {
    constructor(
        private readonly pythOraclePriceService: PythOraclePriceService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
        private readonly spotPriceService: SpotPriceService,
    ) {}

    public async calculatePositionValue(
        {
            before,
            after,
            bot,
            isOpen,
            state,
        }: CalculatePositionValueParams
    ): Promise<CalculatePositionValueResult> {
        const targetToken = this.primaryMemoryStorageService.tokens.find(token => token.id === bot.targetToken.toString())
        if (!targetToken) {
            throw new TokenNotFoundException("Target token not found")
        }
        const quoteToken = this.primaryMemoryStorageService.tokens.find(token => token.id === bot.quoteToken.toString())
        if (!quoteToken) {
            throw new TokenNotFoundException("Quote token not found")
        }
        const gasToken = this.primaryMemoryStorageService.tokens.find(token => {
            return token.type === TokenType.Native && token.chainId === bot.chainId
        })
        if (!gasToken) {
            throw new TokenNotFoundException("Gas token not found")
        }
        const [
            quoteOraclePrice, 
            gasOraclePrice
        ] = await this.asyncService.allMustDone(
            [
                this.asyncService.executeWithFallbacks({
                    action: async () => {
                        return await this.pythOraclePriceService.getPythOraclePrice({
                            tokenA: quoteToken.displayId,
                            tokenB: targetToken.displayId,
                        })
                    },
                    fallbacks: [
                        async () => {
                            return await this.spotPriceService.getSpotPrice({
                                state,
                            })
                        },
                        async () => {
                            return new Decimal(1)
                        },
                    ],
                    attempts: 1
                }),
                this.asyncService.executeWithFallbacks({
                    action: async () => {
                        return await this.pythOraclePriceService.getPythOraclePrice({
                            tokenA: gasToken.displayId,
                            tokenB: targetToken.displayId,
                        })
                    },
                    fallbacks: [
                        async () => {
                            return await this.spotPriceService.getSpotPrice({
                                state,
                            })
                        },
                        async () => {
                            return new Decimal(1)
                        },
                    ],
                    attempts: 1
                }
                )
            ] as const
        )
        // priceA/priceB
        const beforeTargetBalanceAmountInTarget = computeDenomination(
            before.targetBalanceAmount, 
            targetToken.decimals
        )
        const beforeQuoteBalanceAmountInTarget = computeDenomination(
            before.quoteBalanceAmount, 
            quoteToken.decimals
        ).mul(quoteOraclePrice)
        const beforeGasBalanceAmountInTarget = computeDenomination(
            before.gasBalanceAmount, 
            gasToken.decimals
        ).mul(gasOraclePrice)
        const beforeTotalBalanceAmountInTarget = beforeTargetBalanceAmountInTarget.add(
            beforeQuoteBalanceAmountInTarget
        ).add(beforeGasBalanceAmountInTarget)
        const afterTargetBalanceAmountInTarget = computeDenomination(
            after.targetBalanceAmount, 
            targetToken.decimals
        )
        const afterQuoteBalanceAmountInTarget = computeDenomination(
            after.quoteBalanceAmount, 
            quoteToken.decimals
        ).mul(quoteOraclePrice)
        const afterGasBalanceAmountInTarget = computeDenomination(
            after.gasBalanceAmount, 
            gasToken.decimals
        ).mul(gasOraclePrice)
        const afterTotalBalanceAmountInTarget = afterTargetBalanceAmountInTarget.add(
            afterQuoteBalanceAmountInTarget
        ).add(afterGasBalanceAmountInTarget)      
        const diffInTarget = afterTotalBalanceAmountInTarget.sub(beforeTotalBalanceAmountInTarget)
        const positionValue = isOpen ? diffInTarget.neg() : diffInTarget
        return {
            positionValue,
        }
    }
}

export interface CalculatePositionValueParams {
    before: CalculatePositionValue,
    after: CalculatePositionValue,
    bot: BotSchema,
    isOpen: boolean,
    state: LiquidityPoolState | DlmmLiquidityPoolState,
}

export interface CalculatePositionValue {
    targetBalanceAmount: BN
    quoteBalanceAmount: BN
    gasBalanceAmount: BN
}

export interface CalculatePositionValueResult {
    positionValue: Decimal
}