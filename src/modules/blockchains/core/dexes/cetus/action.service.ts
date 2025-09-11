import { Injectable } from "@nestjs/common"
import {
    ClosePositionParams,
    IActionService,
    OpenPositionParams,
} from "../../interfaces"
import CetusClmmSDK, {
    adjustForCoinSlippage,
    ClmmPoolUtil,
    Percentage,
    TickMath,
} from "@cetusprotocol/cetus-sui-clmm-sdk"
import BN from "bn.js"
import { InjectCetusClmmSdks } from "./cetus.decorators"
import { Network } from "@modules/common"
import { ActionResponse } from "../../types"
import { TickManagerService } from "../../tick-manager.service"

@Injectable()
export class CetusActionService implements IActionService {
    constructor(
    @InjectCetusClmmSdks()
    private readonly cetusClmmSdks: Record<Network, CetusClmmSDK>,
    private readonly tickManagerService: TickManagerService,
    ) {}

    // ---------- Open Position ----------
    async openPosition({
        pool,
        txb,
        network = Network.Mainnet,
    }: OpenPositionParams): Promise<ActionResponse> {
        const { tickLower, tickUpper } = this.tickManagerService.tickBounds(pool)
        const txbAfter = this.cetusClmmSdks[
            network
        ].Position.openPositionTransactionPayload(
            {
                coinTypeA: pool.token0.tokenAddress,
                coinTypeB: pool.token1.tokenAddress,
                tick_lower: new BN(tickLower).toString(),
                tick_upper: new BN(tickUpper).toString(),
                pool_id: pool.poolAddress,
            },
            txb,
        )
        return {
            txb: txbAfter,
        }
    }

    // ---------- Close Position ----------
    async closePosition({
        pool,
        position,
        network = Network.Mainnet,
        txb,
        slippage = 5, // 5% default
    }: ClosePositionParams): Promise<ActionResponse> {
        // tính toán giá trị min nhận về
        const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(
            position.tickLowerIndex,
        )
        const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(
            position.tickUpperIndex,
        )
        const liquidity = new BN(position.liquidity)
        const curSqrtPrice = new BN(pool.currentSqrtPrice)

        const slippageTolerance = new Percentage(
            new BN(Math.floor(slippage)),
            new BN(100),
        )

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

        const txbAfter = await this.cetusClmmSdks[
            network
        ].Position.closePositionTransactionPayload({
            coinTypeA: pool.token0.tokenAddress,
            coinTypeB: pool.token1.tokenAddress,
            min_amount_a: tokenMaxA.toString(),
            min_amount_b: tokenMaxB.toString(),
            rewarder_coin_types: pool.rewardTokens.map((r) => r.tokenAddress),
            pool_id: pool.poolAddress,
            pos_id: position.positionId,
            collect_fee: true,
        }, txb)

        return {
            txb: txbAfter,
        }
    }
}
