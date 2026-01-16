import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { SwapMathService } from "@modules/blockchains"
import { PrimaryMemoryStorageService, TokenId } from "@modules/databases"
import { ChainId, TokenType } from "@typedefs"
import BN from "bn.js"

@Injectable()
export class ComputeSwapAmountsService implements OnApplicationBootstrap {
    constructor(
        private readonly swapMathService: SwapMathService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    onApplicationBootstrap() {
        this.computeSuiSwapAmountsWhenNeitherTargetNorQuoteIsGas()
    }

    private async computeSuiSwapAmountsWhenNeitherTargetNorQuoteIsGas() {
        // target and quote tokens are not gas tokens
        const targetTokenId = TokenId.SuiIka
        const quoteTokenId = TokenId.SuiUsdc
        const chainId = ChainId.Sui
        // get the tokens instances
        const targetToken = this.primaryMemoryStorageService.tokens.find(
            token => token.displayId === targetTokenId
        )
        const quoteToken = this.primaryMemoryStorageService.tokens.find(
            token => token.displayId === quoteTokenId
        )
        const gasToken = this.primaryMemoryStorageService.tokens.find(
            token => token.type === TokenType.Native
            && token.chainId === chainId
        )
        if (!targetToken || !quoteToken || !gasToken) {
            throw new Error("Target, quote or gas token not found")
        }
        
        const scenarios = [
            {
                inputs: {
                    targetBalanceAmount: 0, // no IKA
                    quoteBalanceAmount: 100, // 100 USDC
                    gasBalanceAmount: 0.075, // 0.075 SUI
                },
                outputs: {
                },
            },
        ]
        // get the swap amounts
        for (const scenario of scenarios) {
            const swapAmounts = await this.swapMathService.computeSwapAmounts({
                targetTokenId,
                quoteTokenId,
                targetBalanceAmount: new BN(scenario.inputs.targetBalanceAmount),
                quoteBalanceAmount: new BN(scenario.inputs.quoteBalanceAmount),
                gasBalanceAmount: new BN(scenario.inputs.gasBalanceAmount),
            })
            console.log(swapAmounts)
        }
    }
}
