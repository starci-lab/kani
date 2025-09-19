import { Injectable } from "@nestjs/common"
import { Network } from "@modules/common"
import { 
    SuiCoinManagerService,  
} from "../utils"
import { SuiSwapService } from "./sui-swap.service"
import { ForceSwapParams } from "../interfaces"
import { ActionResponse } from "../dexes"
import { InjectSuiClients } from "../clients"
import { SuiClient } from "@mysten/sui/client"
import { FeeToService } from "./fee-to.service"

@Injectable()
export class SuiForceSwapService {
    constructor(
    private readonly suiSwapService: SuiSwapService,
    private readonly suiCoinManagerService: SuiCoinManagerService,
    private readonly feeToService: FeeToService,
    @InjectSuiClients()
    private readonly suiClients: Record<Network, Array<SuiClient>>,
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
    }: ForceSwapParams): Promise<ActionResponse> {
        // use first client if not provided
        suiClient = suiClient || this.suiClients[network][0]
        const tokenA = tokens.find((t) => t.displayId === tokenAId)
        const tokenB = tokens.find((t) => t.displayId === tokenBId)
        if (!tokenA || !tokenB) throw new Error("Token not found")

        const tokenIn = priorityAOverB ? tokenB : tokenA
        const tokenOut = priorityAOverB ? tokenA : tokenB

        // 1. Merge all tokenIn coins
        const { sourceCoin } = await this.suiCoinManagerService.fetchAndMergeCoins({
            suiClient,
            coinType: tokenIn.tokenAddress,
            owner: accountAddress,
            requiredAmount: pnlAmount,
        })

        // 2. Swap all tokenIn → tokenOut
        const { coinOut } = await this.suiSwapService.swap({
            tokenIn: tokenIn.displayId,
            tokenOut: tokenOut.displayId,
            inputCoin: sourceCoin,
            transferCoinObjs: false,
            slippage,
            fromAddress: accountAddress,
            tokens,
        })

        if (!coinOut) throw new Error("Swap result coinOut is missing")

        // 3. Attach PnL fee nếu có
        // if (pnlAmount && pnlAmount.gt(ZERO_BN)) {
        //     const { sourceCoin } = await this.feeToService.attachSuiPnlFee({
        //         txb: finalTxb,
        //         amount: pnlAmount,
        //         tokenId: tokenOut.displayId,
        //         tokens,
        //         network,
        //         sourceCoin: {
        //             coinArg: coinOut,
        //             coinAmount: pnlAmount,
        //         },
        //         network,
        //     })
        //     finalTxb = txbAfterSwap
        // }

        return { }
    }
}