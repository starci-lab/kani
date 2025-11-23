import { Injectable } from "@nestjs/common"
import Decimal from "decimal.js"
import { OraclePriceService } from "../pyth"
import { PrimaryMemoryStorageService, TokenId } from "@modules/databases"
import { ChainId, Network, TokenType } from "@modules/common"
import { TokenNotFoundException } from "@exceptions"
import { GasStatusService } from "./gas-status.service"
import { GasStatus } from "./types"
import { computeDenomination } from "@utils"
import { AsyncService } from "@modules/mixin"
import BN from "bn.js"

@Injectable()
export class ProfitabilityMathService {
    constructor(
        private readonly oraclePriceService: OraclePriceService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly gasStatusService: GasStatusService,
        private readonly asyncService: AsyncService,
    ) {}

    public async calculateProfitability(
        {
            before,
            after,
            targetTokenId,
            quoteTokenId,
            chainId,
            network = Network.Mainnet,
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
        const gasStatus = await this.gasStatusService.getGasStatus({
            targetTokenId,
            quoteTokenId,
        })
        switch (gasStatus) {
        case GasStatus.IsTarget: 
        case GasStatus.IsQuote: 
        {
            const oraclePrice = await this.oraclePriceService.getOraclePrice({
                tokenA: quoteToken.displayId,
                tokenB: targetToken.displayId,
            })
            // compute before total balance amount in target
            const beforeTargetBalanceAmountInTarget = computeDenomination(before.targetTokenBalanceAmount, targetToken.decimals)
            const beforeQuoteBalanceAmountInTarget = computeDenomination(before.quoteTokenBalanceAmount, quoteToken.decimals).div(oraclePrice)
            const beforeTotalBalanceAmountInTarget = beforeTargetBalanceAmountInTarget.add(beforeQuoteBalanceAmountInTarget)
            // compute after total balance amount in target
            const afterTargetBalanceAmountInTarget = computeDenomination(after.targetTokenBalanceAmount, targetToken.decimals)
            const afterQuoteBalanceAmountInTarget = computeDenomination(after.quoteTokenBalanceAmount, quoteToken.decimals).div(oraclePrice)
            const afterTotalBalanceAmountInTarget = afterTargetBalanceAmountInTarget.add(afterQuoteBalanceAmountInTarget)
            // compute pnl
            const pnl = afterTotalBalanceAmountInTarget.div(beforeTotalBalanceAmountInTarget)
            // compute pnl
            const roi = pnl.div(beforeTotalBalanceAmountInTarget).mul(100)
            return {
                roi,
                pnl,
            }
        }
        case GasStatus.IsGas: {
            const gasToken = this.primaryMemoryStorageService.tokens.find(token => {
                return token.type === TokenType.Native && token.chainId === chainId && token.network === network
            })
            if (!gasToken) {
                throw new TokenNotFoundException("Gas token not found")
            }
            const [
                quoteOraclePrice, 
                gasOraclePrice
            ] = await this.asyncService.allMustDone([
                this.oraclePriceService.getOraclePrice({
                    tokenA: quoteToken.displayId,
                    tokenB: targetToken.displayId,
                }),
                this.oraclePriceService.getOraclePrice({
                    tokenA: gasToken.displayId,
                    tokenB: quoteToken.displayId,
                }),
            ])
            const beforeTargetBalanceAmountInTarget = computeDenomination(before.targetTokenBalanceAmount, targetToken.decimals)
            const beforeQuoteBalanceAmountInTarget = computeDenomination(before.quoteTokenBalanceAmount, quoteToken.decimals).div(quoteOraclePrice)
            const beforeGasBalanceAmountInTarget = computeDenomination(before.gasBalanceAmount, gasToken.decimals).div(gasOraclePrice)
            const beforeTotalBalanceAmountInTarget = beforeTargetBalanceAmountInTarget.add(beforeQuoteBalanceAmountInTarget).add(beforeGasBalanceAmountInTarget)
            
            const afterTargetBalanceAmountInTarget = computeDenomination(after.targetTokenBalanceAmount, targetToken.decimals)
            const afterQuoteBalanceAmountInTarget = computeDenomination(after.quoteTokenBalanceAmount, quoteToken.decimals).div(quoteOraclePrice)
            const afterGasBalanceAmountInTarget = computeDenomination(after.gasBalanceAmount, gasToken.decimals).div(gasOraclePrice)
            const afterTotalBalanceAmountInTarget = afterTargetBalanceAmountInTarget.add(afterQuoteBalanceAmountInTarget).add(afterGasBalanceAmountInTarget)
            
            const pnl = afterTotalBalanceAmountInTarget.div(beforeTotalBalanceAmountInTarget)
            const roi = pnl.div(beforeTotalBalanceAmountInTarget).mul(100)
            return {
                roi,
                pnl,
            }
        }
        }
    }
}

export interface CalculateProfitabilityParams {
    before: CalculateProfitability,
    after: CalculateProfitability,
    targetTokenId: TokenId,
    quoteTokenId: TokenId,
    chainId: ChainId,
    network?: Network,
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