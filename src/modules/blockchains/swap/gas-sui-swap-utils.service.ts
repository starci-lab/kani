import { Injectable } from "@nestjs/common"
import { Transaction, TransactionObjectArgument } from "@mysten/sui/transactions"
import { ChainId, Network, TokenType, toScaledBN, toUnit } from "@modules/common"
import { SuiClient } from "@mysten/sui/client"
import BN from "bn.js"
import { TokenId, TokenLike } from "@modules/databases"
import { GAS_SUI_SWAP_SLIPPAGE } from "./constants"
import { SuiSwapService } from "./sui-swap.service"
import { PythService } from "../pyth"
import { InjectSuiClients } from "../clients"
import { SuiCoinManagerService } from "../utils"

export interface GasSuiSwapParams {
    txb?: Transaction
    network?: Network
    accountAddress: string
    tokenInId: TokenId
    tokens: Array<TokenLike>
    slippage?: number
    amountIn?: BN
    suiClient?: SuiClient
    sourceCoin?: TransactionObjectArgument
}

export interface GasSuiSwapResponse {
    txb: Transaction
    remainingAmount?: BN
    requireGasSwap: boolean
    sourceCoin: TransactionObjectArgument
}

const SUI_GAS_LIMIT = new BN(300_000_000) // 0.3 SUI in mist units
const SUI_GAS_TARGET = new BN(600_000_000) // 0.6 SUI in mist units

@Injectable()
export class GasSuiSwapUtilsService {
    constructor(
        private readonly suiSwapService: SuiSwapService,
        private readonly pythService: PythService,
        private readonly suiCoinManagerService: SuiCoinManagerService,
        @InjectSuiClients()
        private readonly suiClients: Record<Network, Array<SuiClient>>,
    ) {}

    /**
     * Ensure enough SUI gas:
     * - If balance >= 0.3 → ok, no swap
     * - If balance < 0.3 → swap tokenIn → SUI until balance >= 0.6
     */
    async gasSuiSwap({
        txb,
        network = Network.Mainnet,
        accountAddress,
        tokenInId,
        tokens,
        amountIn,
        slippage,
        suiClient,
        sourceCoin,
    }: GasSuiSwapParams): Promise<GasSuiSwapResponse> {
        suiClient = suiClient || this.suiClients[network][0]
        txb = txb ?? new Transaction()
        slippage = slippage ?? GAS_SUI_SWAP_SLIPPAGE

        const tokenNative = tokens.find((token) => token.type === TokenType.Native)
        const tokenIn = tokens.find((token) => token.displayId === tokenInId)
        if (!tokenNative || !tokenIn) {
            throw new Error("Token not found")
        }

        if (!sourceCoin) {
            const coinResponse = await this.suiCoinManagerService.fetchAndMergeCoins({
                owner: accountAddress,
                coinType: tokenIn.tokenAddress,
                txb,
                suiClient,
            })
            if (!coinResponse) {
                throw new Error("No coin found")
            }
            ({ sourceCoin } = coinResponse)
        }

        // --- 1. Check current SUI balance
        const balance = await suiClient.getBalance({
            owner: accountAddress,
            coinType: tokenNative.tokenAddress,
        })
        const balanceBN = new BN(balance.totalBalance)

        // If balance >= 0.3 SUI, no swap
        if (balanceBN.gte(SUI_GAS_LIMIT)) {
            return { txb, requireGasSwap: false, sourceCoin }
        }

        // --- 2. Fetch oracle price (tokenIn → SUI)
        // mean that 1 sui = oraclePrice  tokenIn
        // requre t sui = t x oraclePrice  tokenIn
        const oraclePrice = await this.pythService.computeOraclePrice({
            tokenAId: tokenNative.displayId,
            tokenBId: tokenIn.displayId,
            chainId: ChainId.Sui,
            network,
        })
        if (!oraclePrice || oraclePrice.lte(0)) {
            throw new Error("Invalid oracle price")
        }
        // --- 3. Compute how much SUI is missing to reach 0.6
        const neededSui = SUI_GAS_TARGET.sub(balanceBN)
        if (neededSui.lte(new BN(0))) {
            return { txb, requireGasSwap: false, sourceCoin }
        }
        const swapAmount = toScaledBN(
            neededSui.mul(toUnit(tokenIn.decimals)),
            oraclePrice
        ).div(
            toUnit(tokenNative.decimals)
        )
        console.log(swapAmount.toString())
        // --- 5. Append swap action
        const { routerId, quoteData } = await this.suiSwapService.quote({
            tokenIn: tokenIn.displayId,
            tokenOut: tokenNative.displayId,
            amountIn: swapAmount,
            tokens,
        })

        const { spendCoin } = await this.suiCoinManagerService.splitCoin({
            requiredAmount: swapAmount,
            sourceCoin,
            txb,
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
            inputCoinObj: spendCoin,
            quoteData,
            routerId,
        })

        const remainingAmount = amountIn ? amountIn.sub(swapAmount) : undefined
        return {
            txb: txbAfterSwap || txb,
            remainingAmount,
            sourceCoin,
            requireGasSwap: true,
        }
    }
}