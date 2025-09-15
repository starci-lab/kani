import { Injectable } from "@nestjs/common"
import {
    ClosePositionParams,
    IActionService,
    OpenPositionParams,
} from "../interfaces"
import { InjectMomentumClmmSdks } from "./momentum.decorators"
import { Network, ZERO_BN, computePercentage } from "@modules/common"
import { MmtSDK, TickMath } from "@mmt-finance/clmm-sdk"
import { ActionResponse } from "../types"
import { Transaction } from "@mysten/sui/transactions"
import { 
    SuiCoinManagerService, 
    TickManagerService, 
    FeeToService, 
    GasSuiSwapUtilsService, 
    OPEN_POSITION_SLIPPAGE,
    PriceRatioService
} from "@modules/blockchains"
import { InjectSuiClients } from "@modules/blockchains"
import { SuiClient } from "@mysten/sui/client"
import { clientIndex } from "./inner-constants"

@Injectable()
export class MomentumActionService implements IActionService {
    private readonly suiClient: SuiClient
    constructor(
        @InjectMomentumClmmSdks()
        private readonly momentumClmmSdks: Record<Network, MmtSDK>,
        private readonly tickManagerService: TickManagerService,
        private readonly suiCoinManagerService: SuiCoinManagerService,
        private readonly priceRatioService: PriceRatioService,
        private readonly feeToService: FeeToService,
        private readonly gasSuiSwapUtilsService: GasSuiSwapUtilsService,
        @InjectSuiClients()
        private readonly suiClients: Record<Network, Array<SuiClient>>,
    ) {}

    /**
     * Open LP position on Momentum CLMM
     */
    async openPosition({
        pool,
        network = Network.Mainnet,
        tokenAId,
        tokenBId,
        tokens,
        priorityAOverB,
        accountAddress,
        slippage,
        txb,
        amount, // input capital amount
    }: OpenPositionParams): Promise<ActionResponse> {
        slippage = slippage || OPEN_POSITION_SLIPPAGE
        // we use the correct client for the dex
        const suiClient = this.suiClients[network][clientIndex]
        txb = txb || new Transaction()
        const momentumSdk = this.momentumClmmSdks[network]

        // 1. Locate tokens
        const tokenA = tokens.find((token) => token.displayId === tokenAId)
        const tokenB = tokens.find((token) => token.displayId === tokenBId)
        if (!tokenA || !tokenB) throw new Error("Token not found")

        // 2. Ensure enough gas: swap some token into SUI if necessary
        const {
            txb: txAfterSwapGas,
            requireGasSwap,
            remainingAmount: remainingAmountAfterSwapGas
        } = await this.gasSuiSwapUtilsService.gasSuiSwap({
            network,
            accountAddress,
            tokenInId: priorityAOverB ? tokenA.displayId : tokenB.displayId,
            tokens,
            txb,
            slippage,
            suiClient
        })
        if (requireGasSwap) {
            if (!remainingAmountAfterSwapGas) {
                throw new Error("Remaining amount after swap gas is missing")
            }
            amount = remainingAmountAfterSwapGas
        }

        // 3. Attach platform fee (deduct in SUI)
        const {
            txb: txAfterAttachFee,
            sourceCoin,
        } = await this.feeToService.attachSuiFee({
            txb: txAfterSwapGas,
            tokenAddress: (priorityAOverB ? tokenA : tokenB).tokenAddress,
            accountAddress,
            network,
            amount,
            suiClient
        })

        // 4. Compute tick bounds and sqrt prices
        const { tickLower, tickUpper } = this.tickManagerService.tickBounds(pool)
        const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(tickLower)
        const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(tickUpper)

        // 8. Open position → returns NFT object
        const position = momentumSdk.Position.openPosition(
            txAfterAttachFee,
            {
                objectId: pool.poolAddress,
                tokenXType: tokenA.tokenAddress,
                tokenYType: tokenB.tokenAddress,
                tickSpacing: pool.tickSpacing,
            },
            lowerSqrtPrice.toString(),
            upperSqrtPrice.toString(),
        )

        // 9. Add liquidity (single sided)
        await momentumSdk.Pool.addLiquiditySingleSidedV2({
            txb: txAfterAttachFee,
            isXtoY: priorityAOverB,
            pool: {
                tokenXType: tokenA.tokenAddress,
                tokenYType: tokenB.tokenAddress,
                objectId: pool.poolAddress,
                tickSpacing: pool.tickSpacing,
            },
            position,
            inputCoin: sourceCoin,
            transferToAddress: accountAddress,
            slippagePercentage: computePercentage(slippage),
            useMvr: false,
        })

        // 10. Return final transaction block
        return { txb: txAfterAttachFee }
    }

    async closePosition({
        pool,
        position,
        network = Network.Mainnet,
        txb,
        accountAddress,
    }: ClosePositionParams): Promise<ActionResponse> {
        txb = txb || new Transaction()
        const momentumSdk = this.momentumClmmSdks[network]
        // 1. Remove liquidity
        momentumSdk.Pool.removeLiquidity(
            txb,
            {
                objectId: pool.poolAddress,
                tokenXType: pool.token0.tokenAddress,
                tokenYType: pool.token1.tokenAddress,
                tickSpacing: pool.tickSpacing,
            },
            position.positionId,
            BigInt(position.liquidity),
            BigInt(ZERO_BN.toString()), // minAmountX (slippage protection can be added here)
            BigInt(ZERO_BN.toString()), // minAmountY
            accountAddress,
            true
        )
        if (pool.rewardTokens && pool.rewardTokens.length > 0) {
            if (!pool.mmtRewarders) {
                throw new Error("Rewarders are not found")
            }
            momentumSdk.Pool.collectAllRewards(
                txb,
                {
                    objectId: pool.poolAddress,
                    tokenXType: pool.token0.tokenAddress,
                    tokenYType: pool.token1.tokenAddress,
                    tickSpacing: pool.tickSpacing,
                },
                pool.mmtRewarders,
                position.positionId,
                accountAddress,
            )
        }
        // 3. Collect fees
        momentumSdk.Pool.collectFee(
            txb,
            {
                objectId: pool.poolAddress,
                tokenXType: pool.token0.tokenAddress,
                tokenYType: pool.token1.tokenAddress,
                tickSpacing: pool.tickSpacing,
            },
            position.positionId,
            accountAddress,
        )
        // 4. Close position NFT
        momentumSdk.Position.closePosition(txb, position.positionId)
        return { txb }
    }
}