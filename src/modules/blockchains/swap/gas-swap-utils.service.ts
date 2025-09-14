import { Injectable } from "@nestjs/common"
import { Transaction } from "@mysten/sui/transactions"
import { InjectSuiClients, PythService, SuiSwapService } from "@modules/blockchains"
import { ChainId, Network, TokenType } from "@modules/common"
import { SuiClient } from "@mysten/sui/client"
import BN from "bn.js"
import { TokenId, TokenLike } from "@modules/databases"

export const GAS_SUI_SWAP_SLIPPAGE = 0.01 // 1%
export interface GasSuiSwapParams {
    txb: Transaction
    network?: Network
    accountAddress: string
    tokenInId: TokenId
    tokens: Array<TokenLike>
    amountIn: string      // how much tokenIn to swap into SUI (max budget)
    slippage?: number
}

const SUI_GAS_LIMIT = new BN(300_000_000) // 0.3 SUI (mist units)

@Injectable()
export class GasSwapUtilsService {
    constructor(
        @InjectSuiClients()
        private readonly suiClients: Record<Network, Array<SuiClient>>,
        private readonly suiSwapService: SuiSwapService,
        private readonly pythService: PythService,
    ) {}

    /**
     * Ensure enough SUI gas. If below threshold, swap `tokenIn` → SUI inside same tx.
     */
    async gasSuiSwap({
        txb,
        network = Network.Mainnet,
        accountAddress,
        tokenInId,
        tokens,
        amountIn,
        slippage,
    }: GasSuiSwapParams): Promise<Transaction> {
        slippage = slippage || GAS_SUI_SWAP_SLIPPAGE
        const suiClient = this.suiClients[network][0]

        const tokenNative = tokens.find((token) => token.type === TokenType.Native)
        const tokenIn = tokens.find((token) => token.displayId === tokenInId)
        if (!tokenNative || !tokenIn) {
            throw new Error("Token not found")
        }

        // Check current SUI balance
        const balance = await suiClient.getBalance({
            owner: accountAddress,
            coinType: tokenNative.tokenAddress,
        })
        const balanceBN = new BN(balance.totalBalance)
        if (balanceBN.gte(SUI_GAS_LIMIT)) {
            // Already enough gas → skip
            return txb
        }

        // Estimate how much tokenIn to swap to get ~0.3 SUI
        const oraclePrice = await this.pythService.computeOraclePrice({
            tokenAId: tokenInId,
            tokenBId: tokenNative.displayId,
            chainId: ChainId.Sui,
            network,
        })

        // requiredSwapAmount = targetGas / price
        // targetGas ở mist (1e9), cần convert về decimals của tokenIn
        const requiredSwapAmount = SUI_GAS_LIMIT
            .mul(new BN(10).pow(new BN(tokenIn.decimals)))
            .div(new BN(oraclePrice?.toFixed(0) || "0"))

        // Limit amountIn to budget
        const swapAmount = BN.min(requiredSwapAmount, new BN(amountIn))

        // Do swap
        const { txb: txbAfterSwap } = await this.suiSwapService.swap({
            txb,
            tokenIn: tokenIn.displayId,
            tokenOut: tokenNative.displayId,
            amountIn: swapAmount,
            tokens,
            fromAddress: accountAddress,
            slippage,
            transferCoinObjs: false,
        })

        return txbAfterSwap || txb
    }
}