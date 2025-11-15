import { Injectable, Logger } from "@nestjs/common"
import { IActionService, OpenPositionParams, OpenPositionResponse } from "../../interfaces"
import { PoolUtils, TxVersion } from "@raydium-io/raydium-sdk-v2"
import { InjectRaydiumClmmSdk } from "./raydium.decorators"
import { Raydium } from "@raydium-io/raydium-sdk-v2"
import Decimals from "decimal.js"

@Injectable()
export class RaydiumActionService implements IActionService {
    private readonly logger = new Logger(RaydiumActionService.name)
    constructor(
        @InjectRaydiumClmmSdk()
        private readonly raydiumClmmSdk: Raydium,
    ) { }

    async closePosition(): Promise<any> {
    }

    async openPosition(
        {
            state,
            amount,
            user
        }: OpenPositionParams
    ): Promise<OpenPositionResponse> {
        const { poolInfo, poolKeys } = await this.raydiumClmmSdk.clmm.getPoolInfoFromRpc(state.static.poolAddress)
        if (!amount) {
            throw new Error("Amount is required")
        }
        const tickLower = new Decimals(0)
        const tickUpper = new Decimals(0)

        const epochInfo = await this.raydiumClmmSdk.fetchEpochInfo()
        const res = await PoolUtils.getLiquidityAmountOutFromAmountIn({
            poolInfo,
            slippage: 0,
            inputA: true,
            tickUpper: tickUpper.toNumber(),
            tickLower: tickLower.toNumber(),
            amount,
            add: true,
            amountHasFee: true,
            epochInfo,
        })
        const { transaction } = await this.raydiumClmmSdk.clmm.openPositionFromLiquidity(
            {
                poolInfo,
                poolKeys,
                tickLower: tickLower.toNumber(),
                tickUpper: tickUpper.toNumber(),
                amountMaxA: amount,
                amountMaxB: amount,
                liquidity: res.liquidity,
                ownerInfo: {
                    useSOLBalance: true,
                },
                txVersion: TxVersion.V0,
                nft2022: true,
                computeBudgetConfig: {
                    computeUnitLimit: 1000000,
                    computeUnitPrice: 1000000,
                },
            }
        )
    }
}


