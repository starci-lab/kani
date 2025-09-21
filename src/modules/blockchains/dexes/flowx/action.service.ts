/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from "@nestjs/common"
import {
    ClosePositionParams,
    IActionService,
    OpenPositionParams,
    OpenPositionResponse,
} from "../../interfaces"
import { InjectFlowXClmmSdks } from "./flowx.decorators"
import { computeRatio, computeRaw, Network, toUnit } from "../../../common"
import { Percent, CoinAmount } from "@flowx-finance/sdk"
import { Transaction } from "@mysten/sui/transactions"
import { ActionResponse } from "../types"
import {
    TickManagerService,
    FeeToService,
    GasSuiSwapUtilsService,
    OPEN_POSITION_SLIPPAGE,
    SWAP_OPEN_POSITION_SLIPPAGE,
    PythService,
    SuiSwapService,
    ZapService,
    PriceRatioService,
} from "../../../blockchains"
import { InjectSuiClients } from "../../clients"
import { SignerService } from "../../signers"
import { SuiClient, SuiObjectChange } from "@mysten/sui/client"
import BN from "bn.js"
import { FlowXClmmSdk } from "./flowx.providers"
import { SuiCoinManagerService, SuiExecutionService, TickMathService } from "../../utils"
import { clientIndex } from "./inner-constants"
import { ClmmPoolUtil } from "@cetusprotocol/cetus-sui-clmm-sdk"
import Decimal from "decimal.js"

@Injectable()
export class FlowXActionService implements IActionService {
    constructor(
    @InjectFlowXClmmSdks()
    private readonly flowxClmmSdks: Record<Network, FlowXClmmSdk>,
    private readonly tickManagerService: TickManagerService,
    private readonly feeToService: FeeToService,
    private readonly gasSuiSwapUtilsService: GasSuiSwapUtilsService,
    @InjectSuiClients()
    private readonly suiClients: Record<Network, Array<SuiClient>>,
    private readonly signerService: SignerService,
    private readonly suiExecutionService: SuiExecutionService,
    private readonly pythService: PythService,
    private readonly tickMathService: TickMathService,
    private readonly zapService: ZapService,
    private readonly suiCoinManagerService: SuiCoinManagerService,
    private readonly suiSwapService: SuiSwapService, 
    private readonly priceRatioService: PriceRatioService,
    ) {}

    /**
   * Open LP position on FlowX CLMM
   */
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
        swapSlippage,
        user,
        suiClient,
        requireZapEligible
    }: OpenPositionParams): Promise<OpenPositionResponse> {
        // const flowXClmmSdk = this.flowxClmmSdks[network]
        txb = txb ?? new Transaction()
        slippage = slippage || OPEN_POSITION_SLIPPAGE
        swapSlippage = swapSlippage || SWAP_OPEN_POSITION_SLIPPAGE
        if (!user) {
            throw new Error("Sui key pair is required")
        }
        suiClient = suiClient || this.suiClients[network][clientIndex]
        const { tickLower, tickUpper } = this.tickManagerService.tickBounds(pool)
        const tokenA = tokens.find((token) => token.displayId === tokenAId)
        const tokenB = tokens.find((token) => token.displayId === tokenBId)
        if (!tokenA || !tokenB) {
            throw new Error("Token not found")
        }
        const tokenIn = priorityAOverB ? tokenA : tokenB
        const tokenOut = priorityAOverB ? tokenB : tokenA
        const oraclePrice = await this.pythService.computeOraclePrice({
            tokenAId,
            tokenBId,
            chainId: tokenA.chainId,
            network,
        })
        const {
            sourceCoin,
        } = await this.gasSuiSwapUtilsService.gasSuiSwap({
            network,
            accountAddress,
            tokenInId: tokenIn.displayId,
            tokens,
            amountIn: amount,
            slippage,
            suiClient,
            txb
        })
        await this.feeToService.attachSuiFee({
            txb,
            tokenId: tokenIn.displayId,
            tokens,
            network,
            amount,
            sourceCoin,
        })
        // use this to calculate the ratio
        const quoteAmountA = computeRaw(1, tokenA.decimals)
        const { coinAmountA, coinAmountB } =
            ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
                tickLower,
                tickUpper,
                quoteAmountA,            // coinAmount must be BN
                true,                             // isCoinA
                false,                                      // roundUp
                slippage,                                   // example 0.01
                pool.currentSqrtPrice,
            )
        const ratio = computeRatio(
            new BN(coinAmountB).mul(toUnit(tokenA.decimals)),
            new BN(coinAmountA).mul(toUnit(tokenB.decimals))
        )
        const spotPrice = this.tickMathService.sqrtPriceX64ToPrice(
            pool.currentSqrtPrice,
            tokenA.decimals,
            tokenB.decimals,
        )
        const { swapAmount, routerId, quoteData, receiveAmount, remainAmount } =
            await this.zapService.computeZapAmounts({
                amountIn: sourceCoin.coinAmount,
                ratio: new Decimal(ratio),
                spotPrice,
                priorityAOverB,
                tokenAId,
                tokenBId,
                tokens,
                oraclePrice,
                network,
                swapSlippage,
            })
        // 4. optional ratio check
        const zapAmountA = priorityAOverB
            ? new BN(sourceCoin.coinAmount) : new BN(receiveAmount)
        const zapAmountB = priorityAOverB
            ? new BN(receiveAmount) : new BN(sourceCoin.coinAmount)
        const isZapEligible = this.priceRatioService.isZapEligible({
            priorityAOverB,
            tokenA: {
                tokenDecimals: tokenA.decimals,
                amount: new BN(zapAmountA),
            },
            tokenB: {
                tokenDecimals: tokenB.decimals,
                amount: new BN(zapAmountB),
            },
        })
        if (requireZapEligible && !isZapEligible) throw new Error("Zap not eligible at this moment") 
        const { spendCoin } = this.suiCoinManagerService.splitCoin({
            txb,
            sourceCoin,
            requiredAmount: swapAmount,
        })
        await this.suiSwapService.swap({
            txb,
            tokenIn: tokenIn.displayId,
            tokenOut: tokenOut.displayId,
            amountIn: swapAmount,
            tokens,
            fromAddress: accountAddress,
            quoteData,
            routerId,
            network,
            slippage: swapSlippage,
            inputCoin: spendCoin,
            transferCoinObjs: false,
        })
        // const coinOut = (extraObj as { coinOut: CoinAsset }).coinOut
        const providedAmountA = priorityAOverB ? remainAmount : receiveAmount
        const providedAmountB = priorityAOverB ? receiveAmount : remainAmount
        const liquidity = ClmmPoolUtil.estimateLiquidityFromcoinAmounts(
            pool.currentSqrtPrice,
            tickLower,
            tickUpper,
            {
                coinA: providedAmountA,
                coinB: providedAmountB,
            }
        )
        // const inputCoinA = priorityAOverB ? sourceCoin : coinOut
        // const inputCoinB = priorityAOverB ? coinOut : sourceCoin
        // if (!pool.flowXClmmPool) {
        //     throw new Error("FlowX CLMM pool is required")
        // }
        // const txbAfterAddLiquidity = flowXClmmSdk.positionManager.openPosition(
        //     new ClmmPosition({
        //         owner: accountAddress,
        //         pool: pool.flowXClmmPool,
        //         tickLower,
        //         tickUpper,
        //         liquidity,
        //         coinsOwedX: 0,
        //         coinsOwedY: 0,
        //         feeGrowthInsideXLast: 0,
        //         feeGrowthInsideYLast: 0,
        //         rewardInfos: []
        //     })
        // )
        let positionId = ""
        const handleObjectChanges = (objectChanges: Array<SuiObjectChange>) => {
            const [positionObjId] = objectChanges
                .filter(
                    (obj): obj is Extract<SuiObjectChange, { type: "created" }> =>
                        obj.type === "created" &&
                obj.objectType.endsWith("::position::Position") &&
                typeof obj.owner === "object" &&
                "AddressOwner" in obj.owner &&
                obj.owner.AddressOwner.toLowerCase() === accountAddress.toLowerCase()
                )
                .map((obj) => obj.objectId)   
            positionId = positionObjId
        }
        const txHash = await this.signerService.withSuiSigner({
            user,
            network,
            action: async (signer) => {
                return await this.suiExecutionService.signAndExecuteTransaction({
                    transaction: txb,
                    suiClient,
                    signer,
                    handleObjectChanges
                })
            },
        })
        return { 
            txHash, 
            tickLower, 
            tickUpper, 
            liquidity, 
            positionId,
            depositAmount: amount
        }
    }

    /**
   * Close LP position on FlowX CLMM
   */
    async closePosition({
        pool,
        position,
        network = Network.Mainnet,
        txb,
        accountAddress,
        user,
        suiClient
    }: ClosePositionParams): Promise<ActionResponse> {
        if (!user) {
            throw new Error("User is required")
        }
        suiClient = suiClient || this.suiClients[network][clientIndex]
        txb = txb || new Transaction()
        const flowxSdk = this.flowxClmmSdks[network]
        const positionManager = flowxSdk.positionManager
        const MaxU64 = new BN("18446744073709551615")

        // Load on-chain position
        const positionToClose = await positionManager.getPosition(position.positionId)

        // Remove all liquidity
        const closeOptions = {
            slippageTolerance: new Percent(1, 100),
            deadline: Date.now() + 3600 * 1000,
            collectOptions: {
                expectedCoinOwedX: CoinAmount.fromRawAmount(pool.token0 as any, MaxU64),
                expectedCoinOwedY: CoinAmount.fromRawAmount(pool.token1 as any, MaxU64),
            },
        }
        positionManager
            .tx(txb as any)
            .decreaseLiquidity(positionToClose, closeOptions)

        // Collect all rewards if available
        const rewards = await positionToClose.getRewards()
        for (let i = 0; i < rewards.length; i++) {
            if (rewards[i].gt(new BN(0))) {
                const collectRewardOptions = {
                    expectedRewardOwed: CoinAmount.fromRawAmount(
                        positionToClose.pool.poolRewards[i].coin as any,
                        MaxU64,
                    ),
                    recipient: accountAddress,
                }
                console.log(collectRewardOptions)
                positionManager
                    .collectPoolReward(positionToClose, i as any)
            }
        }

        // Close the NFT position
        positionManager
            .tx(txb as any)
            .closePosition(positionToClose)

        const txHash = await this.signerService.withSuiSigner({
            user,
            network,
            action: async (signer) => {
                return await this.suiExecutionService.signAndExecuteTransaction({
                    transaction: txb,
                    suiClient,
                    signer,
                })
            },
        })
        return { txHash }
    }
}