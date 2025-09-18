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
    // this is a variable that indicate amount in
    // will ignore it if your priority token is not SUI
    amountIn: BN
    suiClient?: SuiClient
}

export interface GasSuiSwapResponse {
    txb: Transaction
    remainingAmount: BN
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
    }: GasSuiSwapParams): Promise<GasSuiSwapResponse> {
        suiClient = suiClient || this.suiClients[network][0]
        txb = txb ?? new Transaction()
        slippage = slippage ?? GAS_SUI_SWAP_SLIPPAGE
        const tokenNative = tokens.find((token) => token.type === TokenType.Native)
        const tokenIn = tokens.find((token) => token.displayId === tokenInId)
        if (!tokenNative || !tokenIn) {
            throw new Error("Token not found")
        }
        const { 
            sourceCoin
        } = await this.suiCoinManagerService.fetchAndMergeCoins({
            owner: accountAddress,
            coinType: tokenIn.tokenAddress,
            txb,
            suiClient,
            // we need to reserve gas for the swap
            // if the amount in is not sui, ignore this
            suiGasAmount: SUI_GAS_LIMIT,
            suiGasInUsed: amountIn,
        })
        // --- 1. Check current SUI balance
        const { totalBalance } = await suiClient.getBalance({
            owner: accountAddress,
            coinType: tokenNative.tokenAddress,
        }) 
        const balanceBN = new BN(totalBalance)
        // if we use native token as input
        // If balance >= 0.3 SUI, no swap
        if (balanceBN.gte(SUI_GAS_LIMIT)) {
            // case we use native token as input
            if (tokenIn.type === TokenType.Native) {
                let diff = balanceBN.sub(amountIn)
                if (diff.lt(SUI_GAS_LIMIT)) {
                    // adjust amountIn to be the exact amount of balance
                    amountIn = balanceBN.sub(SUI_GAS_LIMIT)
                    diff = SUI_GAS_LIMIT
                }
                const sourceCoinResponse = this.suiCoinManagerService.splitCoin({
                    requiredAmount: amountIn,
                    sourceCoin,
                    txb,
                })
                return { 
                    txb, 
                    requireGasSwap: false, 
                    sourceCoin: sourceCoinResponse.spendCoin,
                    remainingAmount: amountIn,
                }   
            }
            return { txb, requireGasSwap: false, sourceCoin, remainingAmount: amountIn }
        }
        // if we use native token as input and the balance we have is less than 0.3 SUI
        if (tokenIn.type === TokenType.Native) {
            throw new Error("Not enough SUI balance")
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
            return { txb, requireGasSwap: false, sourceCoin, remainingAmount: amountIn }
        }
        const swapAmount = toScaledBN(
            neededSui.mul(toUnit(tokenIn.decimals)),
            oraclePrice
        ).div(
            toUnit(tokenNative.decimals)
        )
        // --- 5. Append swap action
        const { routerId, quoteData } = await this.suiSwapService.quote({
            tokenIn: tokenIn.displayId,
            tokenOut: tokenNative.displayId,
            amountIn: swapAmount,
            tokens,
        })

        const { spendCoin } = this.suiCoinManagerService.splitCoin({
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

        const remainingAmount = amountIn.sub(swapAmount)
        return {
            txb: txbAfterSwap || txb,
            remainingAmount,
            sourceCoin,
            requireGasSwap: true,
        }
    }
}