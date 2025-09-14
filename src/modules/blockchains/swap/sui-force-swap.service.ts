import { Injectable } from "@nestjs/common"
import { TransactionObjectArgument } from "@mysten/sui/transactions"
import { Network, ZERO_BN } from "@modules/common"
import { 
    SuiClient, 
} from "@mysten/sui/client"
import { 
    SuiSwapService, 
    SuiCoinManagerService, 
    FeeToService, 
    ForceSwapParams, 
    ActionResponse 
} from "@modules/blockchains"

@Injectable()
export class SuiForceSwapService {
    constructor(
    private readonly suiSwapService: SuiSwapService,
    private readonly suiCoinManagerService: SuiCoinManagerService,
    private readonly feeToService: FeeToService,
    ) {}

    /**
   * Force swap all tokenIn → tokenOut
   */
    async forceSwap({
        network = Network.Mainnet,
        accountAddress,
        priorityAOverB,
        tokenAId,
        tokenBId,
        tokens,
        slippage,
        pnlAmount,
        suiClient,
    }: ForceSwapParams & { suiClient: SuiClient }): Promise<ActionResponse> {
        const tokenA = tokens.find((t) => t.displayId === tokenAId)
        const tokenB = tokens.find((t) => t.displayId === tokenBId)
        if (!tokenA || !tokenB) throw new Error("Token not found")

        const tokenIn = priorityAOverB ? tokenB : tokenA
        const tokenOut = priorityAOverB ? tokenA : tokenB

        // 1. Merge all tokenIn coins
        const coinResponse = await this.suiCoinManagerService.fetchAndMergeCoins({
            suiClient,
            coinType: tokenIn.tokenAddress,
            owner: accountAddress,
        })
        if (!coinResponse) throw new Error("Coin not found")
        const { sourceCoin } = coinResponse

        // 2. Swap all tokenIn → tokenOut
        const { txb: txbAfterSwap, extraObj } = await this.suiSwapService.swap({
            tokenIn: tokenIn.displayId,
            tokenOut: tokenOut.displayId,
            inputCoinObj: sourceCoin,
            transferCoinObjs: false,
            slippage,
            fromAddress: accountAddress,
            tokens,
        })

        const coinOut = (extraObj as { coinOut: TransactionObjectArgument }).coinOut
        if (!coinOut) throw new Error("Swap result coinOut is missing")

        let finalTxb = txbAfterSwap

        // 3. Attach PnL fee nếu có
        if (pnlAmount && pnlAmount.gt(ZERO_BN)) {
            const { txb: txbAfterAttachFee } = await this.feeToService.attachSuiPnlFee({
                txb: finalTxb,
                amount: pnlAmount,
                tokenAddress: tokenOut.tokenAddress, // thu phí trên tokenOut
                accountAddress,
                network,
                sourceCoin: coinOut,
            })
            finalTxb = txbAfterAttachFee
        }

        return { txb: finalTxb }
    }
}