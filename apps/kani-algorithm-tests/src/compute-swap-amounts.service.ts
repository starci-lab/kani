import {
    Injectable, OnApplicationBootstrap 
} from "@nestjs/common"
import {
    SwapMathService 
} from "@modules/blockchains"
import {
    PrimaryMemoryStorageService, TokenId 
} from "@modules/databases"
import {
    ChainId, TokenType 
} from "@modules/typedefs"
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
        const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            displayId: {
                $eq: targetTokenId
            }
        })
        const quoteToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            displayId: {
                $eq: quoteTokenId
            }
        })
        const gasToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            type: {
                $eq: TokenType.Native
            },
            chainId: {
                $eq: chainId
            }
        })
        if (!targetToken || !quoteToken || !gasToken) {
            throw new Error("Target, quote or gas token not found")
        }
        await sleep(3000)
        const scenarios = [
            {
                inputs: {
                    targetBalanceAmount: new BN(0), // no IKA
                    quoteBalanceAmount: new BN(100_000_000), // 100 USDC
                    gasBalanceAmount: new BN(7_500_000), // 0.075 SUI
                },
                outputs: {
                },
            },
            {
                inputs: {
                    targetBalanceAmount: new BN(100_000_000_000), // 100 IKA
                    quoteBalanceAmount: new BN(100_000_000), // 100 USDC
                    gasBalanceAmount: new BN(7_500_000), // 0.5 SUI
                },
                outputs: {
                },
            },
            {
                inputs: {
                    targetBalanceAmount: new BN(1_000_000_000_000_000), // 100000 IKA
                    quoteBalanceAmount: new BN(0), // no USDC
                    gasBalanceAmount: new BN(7_500_000), // 0.075 SUI
                },
                outputs: {
                },
            },
            {
                inputs: {
                    targetBalanceAmount: new BN(1_000_000_000_000_000), // 100000 IKA
                    quoteBalanceAmount: new BN(0), // no USDC
                    gasBalanceAmount: new BN(500_000_000), // 0.50 SUI
                },
                outputs: {
                },
            },
        ]
        // get the swap amounts
        for (const scenario of scenarios) {
            const swapAmounts = await this.swapMathService.computeSwapAmounts({
                targetToken,
                quoteToken,
                gasToken,
                targetBalanceAmount: scenario.inputs.targetBalanceAmount,
                quoteBalanceAmount: scenario.inputs.quoteBalanceAmount,
                gasBalanceAmount: scenario.inputs.gasBalanceAmount,
            })
            console.log(swapAmounts.swapSteps.map(step => ({
                direction: step.direction,
                usedAmount: step.usedAmount.toString(),
                swappedAmount: step.swappedAmount.toString(),
            })))
        }
    }
}
