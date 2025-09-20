import { Injectable } from "@nestjs/common"
import {
    ClosePositionParams,
    ClosePositionResponse,
    IActionService,
    OpenPositionParams,
    OpenPositionResponse,
} from "../../interfaces"
import { InjectMomentumClmmSdks } from "./momentum.decorators"
import {
    Network,
    ZERO_BN,
    adjustSlippage,
    computeRatio,
    computeRaw,
    incrementBnMap,
    toUnit,
} from "@modules/common"
import { MmtSDK, TickMath } from "@mmt-finance/clmm-sdk"
import { Transaction } from "@mysten/sui/transactions"
import { InjectSuiClients } from "../../clients"
import { SuiClient, SuiEvent, SuiObjectChange } from "@mysten/sui/client"
import { clientIndex } from "./inner-constants"
import BN from "bn.js"
import Decimal from "decimal.js"
import { estLiquidityAndcoinAmountFromOneAmounts } from "@mmt-finance/clmm-sdk/dist/utils/poolUtils"
import {
    FeeToService,
    GasSuiSwapUtilsService,
    ZapService,
    SuiSwapService,
    OPEN_POSITION_SLIPPAGE,
    SWAP_OPEN_POSITION_SLIPPAGE,
} from "../../swap"
import { SignerService } from "../../signers"
import { PythService } from "../../pyth"
import { SuiCoinManagerService } from "../../utils"
import {
    PriceRatioService,
    TickMathService,
    SuiExecutionService,
    TickManagerService,
} from "../../utils"
import { TokenId } from "@modules/databases"

@Injectable()
export class MomentumActionService implements IActionService {
    constructor(
    @InjectMomentumClmmSdks()
    private readonly momentumClmmSdks: Record<Network, MmtSDK>,
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
    private readonly suiSwapService: SuiSwapService,
    private readonly suiCoinManagerService: SuiCoinManagerService,
    private readonly priceRatioService: PriceRatioService,
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
        user,
        suiClient,
        swapSlippage,
        requireZapEligible,
    }: OpenPositionParams): Promise<OpenPositionResponse> {
        txb = txb ?? new Transaction()
        slippage = slippage || OPEN_POSITION_SLIPPAGE
        swapSlippage = swapSlippage || SWAP_OPEN_POSITION_SLIPPAGE
        if (!user) {
            throw new Error("Sui user is required")
        }
        suiClient = suiClient || this.suiClients[network][clientIndex]
        const mmtSdk = this.momentumClmmSdks[network]
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
        const { sourceCoin } = await this.gasSuiSwapUtilsService.gasSuiSwap({
            network,
            amountIn: amount,
            accountAddress,
            tokenInId: tokenIn.displayId,
            tokens,
            slippage,
            suiClient,
            txb,
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
        const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64WithTickSpacing(
            tickLower,
            pool.tickSpacing,
        )
        const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64WithTickSpacing(
            tickUpper,
            pool.tickSpacing,
        )
        const quoteAmountA = computeRaw(1, tokenA.decimals)
        const { coinAmountA, coinAmountB } =
      estLiquidityAndcoinAmountFromOneAmounts(
          tickLower,
          tickUpper,
          quoteAmountA, // coinAmount must be BN
          true, // isCoinA
          true, // roundUp
          slippage, // example 0.01
          pool.currentSqrtPrice,
      )
        const ratio = computeRatio(
            coinAmountB.mul(toUnit(tokenA.decimals)),
            coinAmountA.mul(toUnit(tokenB.decimals)),
        )
        const spotPrice = this.tickMathService.sqrtPriceX64ToPrice(
            pool.currentSqrtPrice,
            tokenA.decimals,
            tokenB.decimals,
        )
        const { swapAmount, routerId, quoteData, receiveAmount } =
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
            ? new BN(sourceCoin.coinAmount)
            : new BN(receiveAmount)
        const zapAmountB = priorityAOverB
            ? new BN(receiveAmount)
            : new BN(sourceCoin.coinAmount)
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
        if (requireZapEligible && !isZapEligible)
            throw new Error("Zap not eligible at this moment")
        const { spendCoin } = this.suiCoinManagerService.splitCoin({
            txb,
            sourceCoin,
            requiredAmount: swapAmount,
        })
        const { coinOut } = await this.suiSwapService.swap({
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
        if (!coinOut) {
            throw new Error("Coin out or change coin is missing")
        }
        const providedCoinA = priorityAOverB ? sourceCoin : coinOut
        const providedCoinB = priorityAOverB ? coinOut : sourceCoin
        const position = mmtSdk.Position.openPosition(
            txb,
            {
                objectId: pool.poolAddress,
                tokenXType: tokenA.tokenAddress,
                tokenYType: tokenB.tokenAddress,
                tickSpacing: pool.tickSpacing,
            },
            lowerSqrtPrice.toString(),
            upperSqrtPrice.toString(),
        )
        mmtSdk.Pool.addLiquidity(
            txb,
            {
                objectId: pool.poolAddress,
                tokenXType: tokenA.tokenAddress,
                tokenYType: tokenB.tokenAddress,
                tickSpacing: pool.tickSpacing,
            },
            position, // Position from previous tx
            providedCoinA.coinArg,
            providedCoinB.coinArg,
            BigInt(
                adjustSlippage(
                    providedCoinA.coinAmount,
                    new Decimal(slippage),
                ).toString(),
            ), // Min a added
            BigInt(
                adjustSlippage(
                    providedCoinB.coinAmount,
                    new Decimal(slippage),
                ).toString(),
            ), // Min b added
            accountAddress,
        )
        txb.transferObjects([position], accountAddress)
        let positionId = ""
        const handleObjectChanges = (objectChanges: Array<SuiObjectChange>) => {
            const [positionObjId] = objectChanges
                .filter(
                    (obj): obj is Extract<SuiObjectChange, { type: "created" }> =>
                        obj.type === "created" &&
            obj.objectType.endsWith("::position::Position") &&
            typeof obj.owner === "object" &&
            "AddressOwner" in obj.owner &&
            obj.owner.AddressOwner.toLowerCase() ===
              accountAddress.toLowerCase(),
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
                    handleObjectChanges,
                })
            },
        })
        const liquidity = await mmtSdk.Position.getLiquidity(positionId)
        return {
            txHash,
            tickLower,
            tickUpper,
            positionId,
            provisionAmount: amount,
            liquidity: new BN(liquidity),
        }
    }

    async closePosition({
        pool,
        position,
        network = Network.Mainnet,
        txb,
        accountAddress,
        user,
        tokenAId,
        tokenBId,
        suiClient,
        tokens,
    }: ClosePositionParams): Promise<ClosePositionResponse> {
        txb = txb || new Transaction()
        if (!user) {
            throw new Error("Sui user is required")
        }
        suiClient = suiClient || this.suiClients[network][clientIndex]
        const momentumSdk = this.momentumClmmSdks[network]
        // 1. Remove liquidity
        momentumSdk.Pool.removeLiquidity(
            txb,
            {
                objectId: pool.poolAddress,
                tokenXType: pool.token0.tokenAddress,
                tokenYType: pool.token1.tokenAddress,
            },
            position.positionId,
            BigInt(position.liquidity),
            BigInt(ZERO_BN.toString()), // minAmountX (slippage protection can be added here)
            BigInt(ZERO_BN.toString()), // minAmountY
            accountAddress,
            true,
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
                },
                pool.mmtRewarders,
                position.positionId,
                undefined,
            )
        }
        // // 3. Collect fees
        momentumSdk.Pool.collectFee(
            txb,
            {
                objectId: pool.poolAddress,
                tokenXType: pool.token0.tokenAddress,
                tokenYType: pool.token1.tokenAddress,
            },
            position.positionId,
            accountAddress
        )
        // // 4. Close position NFT
        momentumSdk.Position.closePosition(txb, position.positionId)
        const suiTokenOuts: Partial<Record<TokenId, BN>> = {}
        const handleEvents = (events: Array<SuiEvent>) => {
            for (const event of events) {
                if (event.type.includes("::collect::FeeCollectedEvent")) {
                    const { amount_x, amount_y } = event.parsedJson as 
                    { amount_x: string, amount_y: string }
                    incrementBnMap(suiTokenOuts, tokenAId, new BN(amount_x))
                    incrementBnMap(suiTokenOuts, tokenBId, new BN(amount_y))
                }
                if (event.type.includes("::collect::CollectPoolRewardEvent")) {
                    const { amount, reward_coin_type } = event.parsedJson as 
                    { amount: string, reward_coin_type: { name: string} }
                    const token = tokens.find((token) => token.tokenAddress.includes(reward_coin_type.name))
                    if (!token) {
                        throw new Error("Token not found")
                    }
                    incrementBnMap(suiTokenOuts, token.displayId, new BN(amount))
                }
                if (event.type.includes("::liquidity::RemoveLiquidityEvent")) {
                    const { amount_x, amount_y } = event.parsedJson as
                    { amount_x: string, amount_y: string }
                    incrementBnMap(suiTokenOuts, tokenAId, new BN(amount_x))
                    incrementBnMap(suiTokenOuts, tokenBId, new BN(amount_y))
                }
            }
        }
        const txHash = await this.signerService.withSuiSigner({
            user,
            network,
            action: async (signer) => {
                return await this.suiExecutionService.signAndExecuteTransaction({
                    transaction: txb,
                    suiClient,
                    signer,
                    stimulateOnly: true,
                    handleEvents,
                })
            },
        })
        return {
            txHash,
            suiTokenOuts,
        }
    }
}
