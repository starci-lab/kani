import { Injectable } from "@nestjs/common"
import {
    ClosePositionParams,
    IActionService,
    OpenPositionParams,
} from "../../interfaces"
import CetusClmmSDK, {
} from "@cetusprotocol/cetus-sui-clmm-sdk"
import BN from "bn.js"
import { InjectCetusClmmSdks } from "./cetus.decorators"
import { Network } from "@modules/common"
import { ActionResponse } from "../../types"
import { TickManagerService } from "../../tick-manager.service"
import { FeeToService } from "../../fee-to.service"
import { InjectCetusZapSdks } from "./cetus.decorators"
import CetusZapSDK from "@cetusprotocol/zap-sdk"
import { PriceRatioService } from "../../price-ratio.service"
import { SuiCoinManagerService } from "../../utils"
import { SuiClient } from "@mysten/sui/client"
import { InjectSuiClients } from "../../clients"

@Injectable()
export class CetusActionService implements IActionService {
    constructor(
    @InjectCetusClmmSdks()
    private readonly cetusClmmSdks: Record<Network, CetusClmmSDK>,
    private readonly tickManagerService: TickManagerService,
    private readonly feeToService: FeeToService,
    @InjectCetusZapSdks()
    private readonly cetusZapSdks: Record<Network, CetusZapSDK>,
    private readonly priceRatioService: PriceRatioService,
    private readonly suiCoinManagerService: SuiCoinManagerService,
    @InjectSuiClients()
    private readonly suiClients: Record<Network, Array<SuiClient>>,
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
        tokens
    }: OpenPositionParams): Promise<ActionResponse> {
        const zapSdk = this.cetusZapSdks[network]
        // get the parameters
        const { tickLower, tickUpper } = this.tickManagerService.tickBounds(pool)
        const slippage = 0.001 // accept up to 0.1% price impact
        const tokenA = tokens.find((token) => token.displayId === tokenAId)
        const tokenB = tokens.find((token) => token.displayId === tokenBId)
        if (!tokenA || !tokenB) {
            throw new Error("Token not found")
        }
        const { 
            txb: txbAfterAttachFee, 
            remainingAmount
        } = await this.feeToService.attachSuiFee({
            txb,
            tokenAddress: tokenA.tokenAddress,
            accountAddress,
            network,
            amount,
        })

        const depositObj = await this.cetusZapSdks[network]
            .Zap
            .preCalculateDepositAmount(
                {
                    pool_id: pool.poolAddress,
                    tick_lower: tickLower,
                    tick_upper: tickUpper,
                    current_sqrt_price: new BN(pool.currentSqrtPrice).toString(),
                    slippage,
                    swap_slippage: slippage,
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
        // we check that zap is not exceed 60/40 support, to save swap fee
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
        if (!isZapEligible) {
            throw new Error("Zap is not eligible at this moment")
        }

        const txbAfterDeposit = await zapSdk.Zap.buildDepositPayload({
            deposit_obj: depositObj,
            pool_id: pool.poolAddress,
            coin_type_a: tokenA.tokenAddress,
            coin_type_b: tokenB.tokenAddress,
            tick_lower: new BN(tickLower).toNumber(),
            tick_upper: new BN(tickUpper).toNumber(),
            slippage,
            swap_slippage: slippage,
        },
        txbAfterAttachFee,
        )
        return {
            txb: txbAfterDeposit,
        }
    }

    // ---------- Close Position ----------
    async closePosition({
        pool,
        position,
        network = Network.Mainnet,
        txb,
        priorityAOverB,
        tokenAId,
        tokenBId,
        tokens
    }: ClosePositionParams): Promise<ActionResponse> {
        const zapSdk = this.cetusZapSdks[network]
        const tokenA = tokens.find((token) => token.displayId === tokenAId)
        const tokenB = tokens.find((token) => token.displayId === tokenBId)
        const slippage = 0.9999 // nearly 1, to ensure the transaction is successful
        if (!tokenA || !tokenB) {
            throw new Error("Token not found")
        }
        const result = await zapSdk.Zap.preCalculateWithdrawAmount({
            coin_decimal_a: tokenA.decimals,
            coin_decimal_b: tokenB.decimals,
            available_liquidity: position.liquidity,
            coin_type_a: tokenA.tokenAddress,
            coin_type_b: tokenB.tokenAddress,
            current_sqrt_price: new BN(pool.currentSqrtPrice).toString(),
            tick_lower: position.tickLowerIndex,
            tick_upper: position.tickUpperIndex,
            mode: priorityAOverB ? "OnlyCoinA" : "OnlyCoinB",
            pool_id: pool.poolAddress,
        })
        const txAfterWithdraw = await zapSdk.Zap.buildWithdrawPayload({
            withdraw_obj: result,
            pool_id: pool.poolAddress,
            pos_id: position.positionId,
            close_pos: true, // Whether to close the position
            collect_fee: true, // Whether to collect accumulated fees
            collect_rewarder_types: [], // Types of rewards to collect
            coin_type_a: tokenA.tokenAddress,
            coin_type_b: tokenB.tokenAddress,
            tick_lower: position.tickLowerIndex,
            tick_upper: position.tickUpperIndex,
            slippage,
        }, txb)
        return {
            txb: txAfterWithdraw,
        }
    }
}
