import { Injectable } from "@nestjs/common"
import {
    ClosePositionParams,
    IActionService,
    OpenPositionParams,
    OpenPositionResponse
} from "../../interfaces"
import { InjectTurbosClmmSdks } from "./turbos.decorators"
import { computePercentage, computeRatio, computeRaw, Network, toUnit, ZERO_BN } from "@modules/common"
import { TurbosSdk } from "turbos-clmm-sdk"
import { TickManagerService } from "../../utils"
import { ActionResponse } from "../../dexes"
import { FeeToService, PriceRatioService, TickMathService } from "../../utils"
import { BN } from "bn.js"
import Decimal from "decimal.js"
import { SuiCoinManagerService } from "../../utils"
import { Transaction, TransactionObjectArgument } from "@mysten/sui/transactions"
import {
    CLOSE_POSITION_SLIPPAGE,
    OPEN_POSITION_SLIPPAGE,
    SuiSwapService,
    SWAP_OPEN_POSITION_SLIPPAGE,
    ZapService
} from "../../swap"
import { SuiClient, SuiObjectChange } from "@mysten/sui/client"
import { GasSuiSwapUtilsService } from "../../swap"
import { clientIndex } from "./inner-constants"
import { SuiExecutionService } from "../../utils"
import { PythService } from "../../pyth"
import { SignerService } from "../../signers"
import { InjectSuiClients } from "../../clients"
import { ClmmPoolUtil } from "@cetusprotocol/cetus-sui-clmm-sdk"

@Injectable()
export class TurbosActionService implements IActionService {
    constructor(
        @InjectTurbosClmmSdks()
        private readonly turbosClmmSdks: Record<Network, TurbosSdk>,
        private readonly tickManagerService: TickManagerService,
        private readonly feeToService: FeeToService,
        private readonly tickMathService: TickMathService,
        private readonly zapService: ZapService,
        private readonly pythService: PythService,
        private readonly suiSwapService: SuiSwapService,
        private readonly suiCoinManagerService: SuiCoinManagerService,
        private readonly gasSuiSwapUtilsService: GasSuiSwapUtilsService,
        private readonly priceRatioService: PriceRatioService,
        private readonly suiExecutionService: SuiExecutionService,
        private readonly signerService: SignerService,
        @InjectSuiClients()
        private readonly suiClients: Record<Network, Array<SuiClient>>,
    ) { }

    // open position
    async openPosition({
        pool,
        network = Network.Mainnet,
        tokenAId,
        tokenBId,
        tokens,
        priorityAOverB,
        accountAddress,
        amount,
        slippage,
        swapSlippage,
        user,
        suiClient,
        txb,
        requireZapEligible = true
    }: OpenPositionParams): Promise<OpenPositionResponse> {
        txb = txb ?? new Transaction()
        slippage = slippage || OPEN_POSITION_SLIPPAGE
        swapSlippage = swapSlippage || SWAP_OPEN_POSITION_SLIPPAGE
        if (!user) {
            throw new Error("Sui key pair is required")
        }
        suiClient = suiClient || this.suiClients[network][clientIndex]
        const turbosSdk = this.turbosClmmSdks[network]
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
            amountIn: amount,
            tokenInId: tokenIn.displayId,
            tokens,
            slippage,
            suiClient,
            txb
        })
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
            sourceCoin
        })
        // use this to calculate the ratio
        const quoteAmountA = computeRaw(1, tokenA.decimals)
        const [
            amountA,
            amountB
        ] = turbosSdk.pool.estimateAmountsFromOneAmount({
            amount: quoteAmountA.toString(),
            isAmountA: true,
            sqrtPrice: pool.currentSqrtPrice.toString(),
            tickLower,
            tickUpper,
        })
        const ratio = computeRatio(
            new BN(amountB).mul(toUnit(tokenA.decimals)),
            new BN(amountA).mul(toUnit(tokenB.decimals))
        )
        const spotPrice = this.tickMathService.sqrtPriceX64ToPrice(
            pool.currentSqrtPrice,
            tokenA.decimals,
            tokenB.decimals,
        )
        const { swapAmount, routerId, quoteData, receiveAmount, remainAmount } =
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
        const { spendCoin } = await this.suiCoinManagerService.splitCoin({
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
        // we process add liquidity
        const providedAmountA = priorityAOverB ? remainAmount : receiveAmount
        const providedAmountB = priorityAOverB ? receiveAmount : remainAmount
        if (!coinOut) {
            throw new Error("Coin out or change coin is missing")
        }
        const providedCoinAmountA = priorityAOverB ? sourceCoin : coinOut
        const providedCoinAmountB = priorityAOverB ? coinOut : sourceCoin
        // we use cetus lib to determine turbos lib
        // since (maybe) the CLMM concepts use the same fomular
        const liquidity = ClmmPoolUtil.estimateLiquidityFromcoinAmounts(
            pool.currentSqrtPrice,
            tickLower,
            tickUpper,
            {
                coinA: providedAmountA,
                coinB: providedAmountB,
            }
        )
        const txbAfterOpenPosition = await turbosSdk.pool.addLiquidityByAmountObject({
            pool: pool.poolAddress,
            address: accountAddress,
            amountA: providedAmountA.toString(),
            amountB: providedAmountB.toString(),
            tickLower,
            tickUpper,
            slippage: computePercentage(slippage),
            txb: txbAfterSwap,
            coinAObjectArguments: [providedCoinAmountA],
            coinBObjectArguments: [providedCoinAmountB],
        })
        let positionId = ""
        const handleObjectChanges = (objectChanges: Array<SuiObjectChange>) => {
            const [positionObjId] = objectChanges
                .filter(
                    (obj): obj is Extract<SuiObjectChange, { type: "created" }> =>
                        obj.type === "created" &&
                obj.objectType.endsWith("::position_nft::TurbosPositionNFT") &&
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
                    transaction: txbAfterOpenPosition,
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
            provisionAmount: remainingAmountAfterGasSuiSwap || amount
        }
    }

    // close postion
    async closePosition({
        pool,
        position,
        network = Network.Mainnet,
        txb,
        accountAddress,
        tokenAId,
        tokenBId,
        tokens,
        slippage,
        user,
        suiClient
    }: ClosePositionParams): Promise<ActionResponse> {
        if (!user) {
            throw new Error("Sui key pair is required")
        }
        suiClient = suiClient || this.suiClients[network][clientIndex]
        // maximum slippage to ensure the transaction is successful
        slippage = slippage || CLOSE_POSITION_SLIPPAGE
        const turbosSdk = this.turbosClmmSdks[network]
        const tokenA = tokens.find((token) => token.displayId === tokenAId)
        const tokenB = tokens.find((token) => token.displayId === tokenBId)
        if (!tokenA || !tokenB) {
            throw new Error("Token not found")
        }
        // txb
        const txbAfterRemoveLiquidity =
            await turbosSdk
                .pool
                .removeLiquidity({
                    txb,
                    nft: position.positionId,
                    pool: pool.poolAddress,
                    address: accountAddress,
                    amountA: ZERO_BN.toString(),
                    amountB: ZERO_BN.toString(),
                    slippage: computePercentage(slippage),
                    collectAmountA: ZERO_BN.toString(),
                    collectAmountB: ZERO_BN.toString(),
                    rewardAmounts: [],
                    decreaseLiquidity: position.liquidity
                })
        const txHash = await this.signerService.withSuiSigner({
            user,
            network,
            action: async (signer) => {
                return await this.suiExecutionService.signAndExecuteTransaction({
                    transaction: txbAfterRemoveLiquidity,
                    suiClient,
                    signer,
                })
            },
        })
        return {
            txHash,
        }
    }
}
