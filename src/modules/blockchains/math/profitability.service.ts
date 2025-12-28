import { Injectable } from "@nestjs/common"
import Decimal from "decimal.js"
import { OraclePriceService } from "../pyth"
import { BotSchema, PrimaryMemoryStorageService, TokenId } from "@modules/databases"
import { TokenType } from "@typedefs"
import { TokenNotFoundException } from "@exceptions"
import { computeDenomination } from "@utils"
import { AsyncService } from "@modules/mixin"
import BN from "bn.js"
import { SpotPriceService } from "../dexes"
import { DlmmLiquidityPoolState, LiquidityPoolState } from "../interfaces"

@Injectable()
export class ProfitabilityMathService {
    constructor(
        private readonly oraclePriceService: OraclePriceService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
        private readonly spotPriceService: SpotPriceService,
    ) {}

    public async calculateProfitability(
        {
            before,
            after,
            targetTokenId,
            quoteTokenId,
            bot,
            state,
        }: CalculateProfitabilityParams
    ): Promise<CalculateProfitabilityResponse> {
        const targetToken = this.primaryMemoryStorageService.tokens.find(token => token.displayId === targetTokenId)
        if (!targetToken) {
            throw new TokenNotFoundException("Target token not found")
        }
        const quoteToken = this.primaryMemoryStorageService.tokens.find(token => token.displayId === quoteTokenId)
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
                        return await this.oraclePriceService.getOraclePrice({
                            tokenA: quoteToken.displayId,
                            tokenB: targetToken.displayId,
                        })
                    },
                    fallbacks: [
                        async () => {
                            return await this.spotPriceService.getSpotPrice({
                                liquidityPoolId: state.static.displayId,
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
                        return await this.oraclePriceService.getOraclePrice({
                            tokenA: gasToken.displayId,
                            tokenB: targetToken.displayId,
                        })
                    },
                    fallbacks: [
                        async () => {
                            return await this.spotPriceService.getSpotPrice({
                                liquidityPoolId: state.static.displayId,
                            })
                        },
                        async () => {
                            return new Decimal(1)
                        },
                    ],
                    attempts: 1
                }
                )
            ]
        )
        // priceA/priceB
        const beforeTargetBalanceAmountInTarget = computeDenomination(
            before.targetTokenBalanceAmount, 
            targetToken.decimals
        )
        const beforeQuoteBalanceAmountInTarget = computeDenomination(
            before.quoteTokenBalanceAmount, 
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
            after.targetTokenBalanceAmount, 
            targetToken.decimals
        )
        const afterQuoteBalanceAmountInTarget = computeDenomination(
            after.quoteTokenBalanceAmount, 
            quoteToken.decimals
        ).mul(quoteOraclePrice)
        const afterGasBalanceAmountInTarget = computeDenomination(
            after.gasBalanceAmount, 
            gasToken.decimals
        ).mul(gasOraclePrice)
        const afterTotalBalanceAmountInTarget = afterTargetBalanceAmountInTarget.add(
            afterQuoteBalanceAmountInTarget
        ).add(afterGasBalanceAmountInTarget)          
        const pnl = afterTotalBalanceAmountInTarget.sub(beforeTotalBalanceAmountInTarget)
        const roi = pnl.div(beforeTotalBalanceAmountInTarget)
        return {
            roi,
            pnl,
        }
    }
}

export interface CalculateProfitabilityParams {
    before: CalculateProfitability,
    after: CalculateProfitability,
    targetTokenId: TokenId,
    quoteTokenId: TokenId,
    bot: BotSchema,
    state: LiquidityPoolState | DlmmLiquidityPoolState,
}

export interface CalculateProfitability {
    targetTokenBalanceAmount: BN
    quoteTokenBalanceAmount: BN
    gasBalanceAmount: BN
}

export interface CalculateProfitabilityResponse {
    roi: Decimal
    pnl: Decimal
}