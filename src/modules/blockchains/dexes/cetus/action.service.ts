import { Percentage, TickMath } from "@cetusprotocol/cetus-sui-clmm-sdk"
import { ClmmPoolUtil, CetusClmmSDK } from "@cetusprotocol/cetus-sui-clmm-sdk"
import { adjustForCoinSlippage } from "@cetusprotocol/cetus-sui-clmm-sdk"
import CetusZapSDK from "@cetusprotocol/zap-sdk"
import {
    ActionResponse,
    FeeToService,
    GasSuiSwapUtilsService,
    IActionService,
    InjectCetusZapSdks,
    OpenPositionParams,
    PriceRatioService,
    TickManagerService,
    ClosePositionParams,
    InjectCetusClmmSdks,
} from "@modules/blockchains"
import { Network } from "@modules/common"
import { Transaction } from "@mysten/sui/transactions"
import { Injectable } from "@nestjs/common"
import BN from "bn.js"
import Decimal from "decimal.js"
import { OPEN_POSITION_SLIPPAGE } from "../../swap"

@Injectable()
export class CetusActionService implements IActionService {
    constructor(
    private readonly tickManagerService: TickManagerService,
    private readonly feeToService: FeeToService,
    @InjectCetusZapSdks()
    private readonly cetusZapSdks: Record<Network, CetusZapSDK>,
    @InjectCetusClmmSdks()
    private readonly cetusClmmSdks: Record<Network, CetusClmmSDK>,
    private readonly priceRatioService: PriceRatioService,
    private readonly gasSuiSwapUtilsService: GasSuiSwapUtilsService,
    ) {}

    // ---------- Open Position ----------
    async openPosition({
        pool,
        txb,
        network = Network.Mainnet,
        priorityAOverB = false,
        amount,
        tokenAId,
        tokenBId,
        accountAddress,
        tokens,
        slippage,
        swapSlippage
    }: OpenPositionParams): Promise<ActionResponse> {
        const zapSdk = this.cetusZapSdks[network]
        const { tickLower, tickUpper } = this.tickManagerService.tickBounds(pool)
        slippage = slippage || OPEN_POSITION_SLIPPAGE
        swapSlippage = swapSlippage || OPEN_POSITION_SLIPPAGE
        const tokenA = tokens.find((token) => token.displayId === tokenAId)
        const tokenB = tokens.find((token) => token.displayId === tokenBId)
        if (!tokenA || !tokenB) throw new Error("Token not found")
    
        // 1. ensure gas (swap sang SUI nếu cần)
        const {
            txb: txAfterGas,
            requireGasSwap,
            remainingAmount: remainAfterGas,
        } = await this.gasSuiSwapUtilsService.gasSuiSwap({
            txb,
            network,
            accountAddress,
            tokenInId: priorityAOverB ? tokenA.displayId : tokenB.displayId,
            tokens,
            slippage,
        })
        if (requireGasSwap) {
            if (!remainAfterGas) {
                throw new Error("Remaining amount after gas swap is missing")
            }
            amount = remainAfterGas
        }
    
        // 2. attach platform fee
        const { txb: txAfterFee, remainingAmount } =
            await this.feeToService.attachSuiFee({
                txb: txAfterGas,
                tokenAddress: tokenA.tokenAddress,
                accountAddress,
                network,
                amount,
            })
    
        // 3. calculate deposit via Zap SDK
        const depositObj = await zapSdk.Zap.preCalculateDepositAmount(
            {
                pool_id: pool.poolAddress,
                tick_lower: tickLower,
                tick_upper: tickUpper,
                current_sqrt_price: new BN(pool.currentSqrtPrice).toString(),
                slippage,
                swap_slippage: swapSlippage,
            },
            {
                mode: priorityAOverB ? "OnlyCoinA" : "OnlyCoinB",
                coin_amount: remainingAmount.toString(),
                coin_decimal_a: tokenA.decimals,
                coin_type_a: tokenA.tokenAddress,
                coin_type_b: tokenB.tokenAddress,
                coin_decimal_b: tokenB.decimals,
            },
        )
    
        // 4. optional ratio check
        const isZapEligible = this.priceRatioService.isZapEligible({
            priorityAOverB,
            tokenA: {
                tokenDecimals: tokenA.decimals,
                amount: new BN(depositObj.amount_a),
            },
            tokenB: {
                tokenDecimals: tokenB.decimals,
                amount: new BN(depositObj.amount_b),
            },
        })
        if (!isZapEligible) throw new Error("Zap not eligible at this moment")
    
        // 5. build deposit payload
        const txbAfterDeposit = await zapSdk.Zap.buildDepositPayload(
            {
                deposit_obj: depositObj,
                pool_id: pool.poolAddress,
                coin_type_a: tokenA.tokenAddress,
                coin_type_b: tokenB.tokenAddress,
                tick_lower: new BN(tickLower).toNumber(),
                tick_upper: new BN(tickUpper).toNumber(),
                slippage,
                swap_slippage: swapSlippage,
            },
            txAfterFee,
        )
    
        return { txb: txbAfterDeposit }
    }

    // ---------- Close Position ----------
    async closePosition({
        pool,
        position,
        network = Network.Mainnet,
        txb,
        tokenAId,
        tokenBId,
        tokens,
    }: ClosePositionParams): Promise<ActionResponse> {
        txb = txb ?? new Transaction()
        const cetusClmmSdk = this.cetusClmmSdks[network]
        const tokenA = tokens.find((token) => token.displayId === tokenAId)
        const tokenB = tokens.find((token) => token.displayId === tokenBId)
        if (!tokenA || !tokenB) {
            throw new Error("Token not found")
        }
    
        // 1. Compute min_amount based on liquidity and TickMath
        const lowerTick = Number(position.tickLower)
        const upperTick = Number(position.tickUpper)
    
        const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(lowerTick)
        const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(upperTick)
    
        const liquidity = new BN(position.liquidity)
        const slippageTolerance = Percentage.fromDecimal(new Decimal("0.05")) // 5% slippage tolerance
        const curSqrtPrice = new BN(pool.currentSqrtPrice)
    
        const coinAmounts = ClmmPoolUtil.getCoinAmountFromLiquidity(
            liquidity,
            curSqrtPrice,
            lowerSqrtPrice,
            upperSqrtPrice,
            false,
        )
    
        const { tokenMaxA, tokenMaxB } = adjustForCoinSlippage(
            coinAmounts,
            slippageTolerance,
            false,
        )
    
        // 2. Build close position payload
        const txbAfterClosePosition =
            await cetusClmmSdk.Position.closePositionTransactionPayload({
                coinTypeA: tokenA.tokenAddress,
                coinTypeB: tokenB.tokenAddress,
                min_amount_a: tokenMaxA.toString(),
                min_amount_b: tokenMaxB.toString(),
                rewarder_coin_types: pool.rewardTokens.map(
                    (rewardToken) => rewardToken.tokenAddress,
                ),
                pool_id: pool.poolAddress,
                pos_id: position.positionId,
                collect_fee: true,
            }, txb)
    
        return { txb: txbAfterClosePosition }
    }
}
