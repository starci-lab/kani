import { Injectable } from "@nestjs/common"
import { Transaction } from "@mysten/sui/transactions"
import { InjectSuiClients, PythService, SuiSwapService } from "@modules/blockchains"
import { ChainId, Network, TokenType } from "@modules/common"
import { SuiClient } from "@mysten/sui/client"
import BN from "bn.js"
import Decimal from "decimal.js"
import { TokenId, TokenLike } from "@modules/databases"
import { GAS_SUI_SWAP_SLIPPAGE } from "./constants"

export interface GasSuiSwapParams {
    txb?: Transaction
    network?: Network
    accountAddress: string
    tokenInId: TokenId
    tokens: Array<TokenLike>
    slippage?: number
    amountIn?: BN
    autoSwapIfInsufficient?: boolean // default = false
    suiClient: SuiClient
}

export interface GasSuiSwapResponse {
    txb: Transaction
    remainingAmount?: BN
    requireGasSwap: boolean
}

const SUI_GAS_LIMIT = new BN(300_000_000) // 0.3 SUI in mist units (1e9 = 1 SUI)

@Injectable()
export class GasSuiSwapUtilsService {
    constructor(
        @InjectSuiClients()
        private readonly suiClients: Record<Network, Array<SuiClient>>,
        private readonly suiSwapService: SuiSwapService,
        private readonly pythService: PythService,
    ) {}

    /**
     * Ensure enough SUI gas. If below threshold:
     * - autoSwapIfInsufficient = true → swap tokenIn → SUI
     * - autoSwapIfInsufficient = false → throw error
     */
    async gasSuiSwap({
        txb,
        network = Network.Mainnet,
        accountAddress,
        tokenInId,
        tokens,
        amountIn,
        slippage,
        autoSwapIfInsufficient = false,
        suiClient
    }: GasSuiSwapParams): Promise<GasSuiSwapResponse> {
        txb = txb ?? new Transaction()
        slippage = slippage ?? GAS_SUI_SWAP_SLIPPAGE
        const tokenNative = tokens.find((token) => token.type === TokenType.Native)
        const tokenIn = tokens.find((token) => token.displayId === tokenInId)
        if (!tokenNative || !tokenIn) {
            throw new Error("Token not found")
        }

        // --- 1. Check current SUI balance
        const balance = await suiClient.getBalance({
            owner: accountAddress,
            coinType: tokenNative.tokenAddress,
        })
        const balanceBN = new BN(balance.totalBalance)

        if (balanceBN.gte(SUI_GAS_LIMIT)) {
            return { txb, requireGasSwap: false }
        }

        if (!autoSwapIfInsufficient) {
            throw new Error(
                `Insufficient SUI balance for gas: have ${balanceBN.toString()}, require ${SUI_GAS_LIMIT.toString()}`
            )
        }

        // --- 2. Fetch oracle price (tokenIn → SUI)
        const oraclePrice = await this.pythService.computeOraclePrice({
            tokenAId: tokenInId,
            tokenBId: tokenNative.displayId,
            chainId: ChainId.Sui,
            network,
        })
        if (!oraclePrice || oraclePrice.lte(0)) {
            throw new Error("Invalid oracle price")
        }

        // --- 3. Compute required swap amount
        const targetGasSui = new Decimal(SUI_GAS_LIMIT.toString()).div(1e9)
        const requiredSwapHuman = targetGasSui.div(oraclePrice)
        const requiredSwapAmount = new BN(
            requiredSwapHuman.mul(new Decimal(10).pow(tokenIn.decimals)).toFixed(0),
        )

        // --- 4. Limit by amountIn budget
        let swapAmount = requiredSwapAmount
        if (amountIn && swapAmount.gt(amountIn)) {
            swapAmount = amountIn
        }

        if (swapAmount.isZero()) {
            return { txb, requireGasSwap: true, remainingAmount: amountIn }
        }

        // --- 5. Append swap action
        const { routerId, quoteData } = await this.suiSwapService.quote({
            tokenIn: tokenIn.displayId,
            tokenOut: tokenNative.displayId,
            amountIn: swapAmount,
            tokens,
        })

        const { txb: txbAfterSwap } = await this.suiSwapService.swap({
            txb,
            tokenIn: tokenIn.displayId,
            tokenOut: tokenNative.displayId,
            amountIn: swapAmount,
            tokens,
            fromAddress: accountAddress,
            slippage,
            transferCoinObjs: true,
            quoteData,
            routerId,
        })

        const remainingAmount = amountIn ? amountIn.sub(swapAmount) : undefined

        return {
            txb: txbAfterSwap || txb,
            remainingAmount,
            requireGasSwap: true,
        }
    }
}