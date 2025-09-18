import { AddLiquidityFixTokenParams, Percentage, TickMath } from "@cetusprotocol/cetus-sui-clmm-sdk"
import { ClmmPoolUtil, CetusClmmSDK } from "@cetusprotocol/cetus-sui-clmm-sdk"
import { adjustForCoinSlippage } from "@cetusprotocol/cetus-sui-clmm-sdk"
import {
    FeeToService,
    PriceRatioService,
    SuiCoinManagerService,
    TickManagerService,
    TickMathService,
} from "../../utils"
import { ClosePositionParams, IActionService, OpenPositionParams, OpenPositionResponse } from "../../interfaces"
import { computeRatio, computeRaw, Network, toUnit } from "@modules/common"
import { Transaction, TransactionObjectArgument } from "@mysten/sui/transactions"
import { Injectable } from "@nestjs/common"
import BN from "bn.js"
import Decimal from "decimal.js"
import { GasSuiSwapUtilsService, OPEN_POSITION_SLIPPAGE, SuiSwapService, SWAP_OPEN_POSITION_SLIPPAGE, ZapService } from "../../swap"
import { SuiClient, SuiObjectChange } from "@mysten/sui/client"
import { clientIndex } from "./inner-constants"
import { SuiExecutionService } from "../../utils"
import { InjectCetusClmmSdks } from "./cetus.decorators"
import { InjectSuiClients } from "../../clients"
import { SignerService } from "../../signers"
import { ActionResponse } from "../types"
import { PythService } from "../../pyth"

@Injectable()
export class CetusActionService implements IActionService {
    constructor(
        private readonly tickManagerService: TickManagerService,
        private readonly feeToService: FeeToService,
        @InjectCetusClmmSdks()
        private readonly cetusClmmSdks: Record<Network, CetusClmmSDK>,
        private readonly priceRatioService: PriceRatioService,
        private readonly gasSuiSwapUtilsService: GasSuiSwapUtilsService,
        @InjectSuiClients()
        private readonly suiClients: Record<Network, Array<SuiClient>>,
        private readonly suiExecutionService: SuiExecutionService,
        private readonly signerService: SignerService,
        private readonly pythService: PythService,
        private readonly tickMathService: TickMathService,
        private readonly zapService: ZapService,
        private readonly suiCoinManagerService: SuiCoinManagerService,
        private readonly suiSwapService: SuiSwapService,
    ) { }

    // ---------- Open Position ----------
    async openPosition({
        pool,
        txb,
        network = Network.Mainnet,
        amount,
        tokenAId,
        tokenBId,
        accountAddress,
        tokens,
        slippage,
        swapSlippage,
        user,
        priorityAOverB,
        suiClient,
        requireZapEligible
    }: OpenPositionParams): Promise<OpenPositionResponse> {
        const cetusClmmSdk = this.cetusClmmSdks[network]
        cetusClmmSdk.senderAddress = accountAddress
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
            txb: txAfterSwapGas,
            sourceCoin,
            remainingAmount: remainingAmountAfterGasSuiSwap
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
        // we reset the amount to the remaining amount after gas sui swap
        amount = remainingAmountAfterGasSuiSwap
        const {
            txb: txbAfterAttachFee,
            remainingAmount,
        } = await this.feeToService.attachSuiFee({
            txb: txAfterSwapGas,
            tokenAddress: tokenIn.tokenAddress,
            accountAddress,
            network,
            amount,
            suiClient,
            sourceCoin,
        })
        // use this to calculate the ratio
        const quoteAmountA = computeRaw(1, tokenA.decimals)
        const { coinAmountA: estCoinAmountA, coinAmountB: estCoinAmountB } =
            ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
                tickLower,
                tickUpper,
                quoteAmountA,            // coinAmount must be BN
                true,                    // isCoinA
                false,                   // roundUp
                slippage,                // example 0.01
                pool.currentSqrtPrice,
            )
        const ratio = computeRatio(
            new BN(estCoinAmountB).mul(toUnit(tokenA.decimals)),
            new BN(estCoinAmountA).mul(toUnit(tokenB.decimals))
        )
        const spotPrice = this.tickMathService.sqrtPriceX64ToPrice(
            pool.currentSqrtPrice,
            tokenA.decimals,
            tokenB.decimals,
        )
        const { 
            swapAmount, 
            routerId, 
            quoteData, 
            receiveAmount, 
            remainAmount
        } =
            await this.zapService.computeZapAmounts({
                amountIn: remainingAmount,
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
            ? new BN(remainingAmount) : new BN(receiveAmount)
        const zapAmountB = priorityAOverB
            ? new BN(receiveAmount) : new BN(remainingAmount)
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
            txb: txbAfterAttachFee,
            sourceCoin,
            requiredAmount: swapAmount,
        })
        const { txb: txbAfterSwap, extraObj } = await this.suiSwapService.swap({
            txb: txbAfterAttachFee,
            tokenIn: tokenIn.displayId,
            tokenOut: tokenOut.displayId,
            amountIn: swapAmount,
            tokens,
            fromAddress: accountAddress,
            quoteData,
            routerId,
            network,
            slippage: swapSlippage,
            inputCoinObj: spendCoin,
            transferCoinObjs: false,
        })
        const coinOut = (extraObj as { coinOut: TransactionObjectArgument }).coinOut
        console.log(remainAmount.toString())
        const { liquidityAmount, coinAmountA, coinAmountB } = ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
            tickLower,
            tickUpper,
            remainAmount,
            priorityAOverB,
            false,
            slippage,
            pool.currentSqrtPrice
        )
        const addLiquidityFixTokenParams: AddLiquidityFixTokenParams = {
            is_open: true,
            slippage,
            coinTypeA: tokenA.tokenAddress,
            coinTypeB: tokenB.tokenAddress,
            pool_id: pool.poolAddress,
            tick_lower: tickLower.toString(),
            tick_upper: tickUpper.toString(),
            amount_a: coinAmountA.toString(),
            amount_b: coinAmountB.toString(),
            rewarder_coin_types: [],
            collect_fee: false,
            fix_amount_a: priorityAOverB,
            pos_id: "",
        }
        if (!txbAfterSwap) {
            throw new Error("Transaction builder is required")
        }
        const inputCoinA = priorityAOverB ? sourceCoin : coinOut
        const inputCoinB = priorityAOverB ? coinOut : sourceCoin
        const txbAfterAddLiquidity = await cetusClmmSdk.Position.createAddLiquidityFixTokenPayload(
            addLiquidityFixTokenParams,
            undefined,
            txbAfterSwap,
            inputCoinA,
            inputCoinB,
        )
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
                    transaction: txbAfterAddLiquidity,
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
            liquidity: liquidityAmount, 
            positionId,
            provisionAmount: remainingAmountAfterGasSuiSwap || amount
        }
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
        user,
        suiClient
    }: ClosePositionParams): Promise<ActionResponse> {
        if (!user) {
            throw new Error("Sui key pair is required")
        }

        suiClient = suiClient || this.suiClients[network][clientIndex]
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
        const slippageTolerance = Percentage.fromDecimal(new Decimal("0.05")) // 5%
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
            await cetusClmmSdk.Position.closePositionTransactionPayload(
                {
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
                },
                txb,
            )

        const txHash = await this.signerService.withSuiSigner({
            user,
            network,
            action: async (signer) => {
                return await this.suiExecutionService.signAndExecuteTransaction({
                    transaction: txbAfterClosePosition,
                    suiClient,
                    signer,
                })
            },
        })

        return { txHash }
    }
}