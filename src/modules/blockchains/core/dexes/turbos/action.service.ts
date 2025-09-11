import { Injectable } from "@nestjs/common"
import { ClosePositionParams, IActionService, OpenPositionParams } from "../../interfaces"
import { InjectTurbosClmmSdks } from "./turbos.decorators"
import { Network, ZERO_BN } from "@modules/common"
import { TurbosSdk } from "turbos-clmm-sdk"
import { TickManagerService } from "../../tick-manager.service"
import { ActionResponse } from "../../types"

@Injectable()
export class TurbosActionService implements IActionService {
    constructor(
        @InjectTurbosClmmSdks()
        private readonly turbosClmmSdks: Record<Network, TurbosSdk>,
        private readonly tickManagerService: TickManagerService,
    ) { }

    // open position
    async openPosition({
        pool,
        network = Network.Mainnet,
        txb,
        amountA,
        amountB,
        toAddress,
        // open position fee (0.02%)
        // with 2k liquidity we only charge 0.4u per position
        fee = 0.0002
    }: OpenPositionParams): Promise<ActionResponse> {
        const { tickLower, tickUpper } = this.tickManagerService.tickBounds(pool)
        const txbAfter = await this.turbosClmmSdks[network].pool.addLiquidity({
            address: toAddress,
            amountA: amountA.toString(),
            amountB: amountB.toString(),
            pool: pool.poolAddress,
            slippage: 10,
            tickUpper,
            tickLower,
            txb,
        })
        return {
            txb: txbAfter
        }
    }

    // close postion
    async closePosition({
        pool,
        position,
        network = Network.Mainnet,
        txb,
        fromAddress,
        // we need to set a high slippage to ensure the transaction is successfu
        // in some case we have to close the position with a high slippage
        slippage = 99.99,
    }: ClosePositionParams): Promise<ActionResponse> {
        const { txb: txbAfter, coinA, coinB } = 
        await this.turbosClmmSdks[network]
            .pool
            .removeLiquidityWithReturn({
                txb,
                nft: position.positionId,
                pool: pool.poolAddress,
                address: fromAddress,
                amountA: ZERO_BN.toString(),
                amountB: ZERO_BN.toString(),
                slippage,
                collectAmountA: ZERO_BN.toString(),
                collectAmountB: ZERO_BN.toString(),
                rewardAmounts: [],
                decreaseLiquidity: position.liquidity
            })
        return {
            txb: txbAfter,
            extraObj: {
                coinA,
                coinB,
            }
        }       
    }
}
