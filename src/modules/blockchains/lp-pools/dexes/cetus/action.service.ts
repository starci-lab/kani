import { Injectable } from "@nestjs/common"
import { ActionResponse, ClosePositionParams, IActionService, OpenPositionParams } from "../../interfaces"
import CetusClmmSDK, {
    adjustForCoinSlippage,
    ClmmPoolUtil,
    Percentage,
    TickMath,
} from "@cetusprotocol/cetus-sui-clmm-sdk"
import BN from "bn.js"
import { InjectCetusClmmSdks } from "./cetus.decorators"
import { Network } from "@modules/common"

@Injectable()
export class CetusActionService implements IActionService {
    constructor(
        @InjectCetusClmmSdks()
        private readonly cetusClmmSdks: Record<Network, CetusClmmSDK>,
    ) { }

    // open position
    async openPosition({
        pool
    }: OpenPositionParams): Promise<ActionResponse> {
        console.log(pool)
        return {
            txHash: "0x123",
        }
    }

    // close postion
    async closePosition({
        pool,
        position,
        network = Network.Mainnet,
    }: ClosePositionParams): Promise<ActionResponse> {
        const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(
            position.tickLowerIndex,
        )
        const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(
            position.tickUpperIndex,
        )

        const liquidity = new BN(position.liquidity)
        const slippageTolerance = new Percentage(new BN(5), new BN(100))
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
        const closePositionPayload =
            await this.cetusClmmSdks[network].Position.closePositionTransactionPayload({
                coinTypeA: pool.token0.tokenAddress,
                coinTypeB: pool.token1.tokenAddress,
                min_amount_a: tokenMaxA.toString(),
                min_amount_b: tokenMaxB.toString(),
                rewarder_coin_types: pool.rewardTokens.map(
                    (rewardToken) => rewardToken.tokenAddress,
                ),
                pool_id: pool.id,
                pos_id: position.id,
                collect_fee: true,
            })
        console.log(closePositionPayload)
        return {
            txHash: "0x123",
        }
    }
}
