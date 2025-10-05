import {
    AddLiquidityParams,
    Percentage,
    TickMath,
} from "@cetusprotocol/cetus-sui-clmm-sdk"
import { ClmmPoolUtil, CetusClmmSDK } from "@cetusprotocol/cetus-sui-clmm-sdk"
import { adjustForCoinSlippage } from "@cetusprotocol/cetus-sui-clmm-sdk"
import {
    ZapProtectionService,
    SuiCoinManagerService,
    TickManagerService,
    TickMathService,
} from "../../utils"
import {
    ClosePositionParams,
    ClosePositionResponse,
    IActionService,
    OpenPositionParams,
    OpenPositionResponse,
} from "../../interfaces"
import {
    computeRatio,
    computeRaw,
    filterOutBnZero,
    incrementBnMap,
    Network,
    toUnit,
} from "@modules/common"
import { Transaction } from "@mysten/sui/transactions"
import { Injectable } from "@nestjs/common"
import BN from "bn.js"
import Decimal from "decimal.js"
import {
    CLOSE_POSITION_SLIPPAGE,
    FeeToService,
    GasSuiSwapUtilsService,
    OPEN_POSITION_SLIPPAGE,
    SuiSwapService,
    SWAP_OPEN_POSITION_SLIPPAGE,
    ZapService,
} from "../../swap"
import { SuiClient, SuiEvent, SuiObjectChange } from "@mysten/sui/client"
import { clientIndex } from "./inner-constants"
import { SuiExecutionService } from "../../utils"
import { InjectCetusClmmSdks } from "./cetus.decorators"
import { InjectSuiClients } from "../../clients"
import { SignerService } from "../../signers"
import { PythService } from "../../pyth"
import { MemDbService, TokenId } from "@modules/databases"

@Injectable()
export class CetusActionService implements IActionService {
    constructor(
        private readonly tickManagerService: TickManagerService,
        private readonly feeToService: FeeToService,
        @InjectCetusClmmSdks()
        private readonly cetusClmmSdks: Record<Network, CetusClmmSDK>,
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
        private readonly zapProtectionService: ZapProtectionService,
        private readonly memDbService: MemDbService,
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
        slippage,
        swapSlippage,
        user,
        priorityAOverB,
        stimulateOnly = false,
        suiClient,
        requireZapEligible,
    }: OpenPositionParams,
    ): Promise<OpenPositionResponse> {
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
        const tokenA = this.memDbService.tokens.find((token) => token.displayId === tokenAId)
        const tokenB = this.memDbService.tokens.find((token) => token.displayId === tokenBId)
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
            accountAddress,
            tokenInId: tokenIn.displayId,
            amountIn: amount,
            slippage,
            suiClient,
            txb,
        })
        const depositAmount = sourceCoin.coinAmount
        await this.feeToService.attachSuiFee({
            txb,
            tokenId: tokenIn.displayId,
            network,
            amount: sourceCoin.coinAmount,
            sourceCoin,
        })
        // use this to calculate the ratio
        const quoteAmountA = computeRaw(1, tokenA.decimals)
        const { coinAmountA: estCoinAmountA, coinAmountB: estCoinAmountB } =
            ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
                tickLower,
                tickUpper,
                quoteAmountA, // coinAmount must be BN
                true, // isCoinA
                true, // roundUp
                slippage, // example 0.01
                pool.currentSqrtPrice,
            )
        const ratio = computeRatio(
            new BN(estCoinAmountB).mul(toUnit(tokenA.decimals)),
            new BN(estCoinAmountA).mul(toUnit(tokenB.decimals)),
        )
        const spotPrice = this.tickMathService.sqrtPriceX64ToPrice(
            pool.currentSqrtPrice,
            tokenA.decimals,
            tokenB.decimals,
        )
        const { swapAmount, routerId, quoteData } =
            await this.zapService.computeZapAmounts({
                amountIn: sourceCoin.coinAmount,
                ratio: new Decimal(ratio),
                spotPrice,
                priorityAOverB,
                tokenAId,
                tokenBId,
                oraclePrice,
                network,
                swapSlippage,
            })
        // zap protection
        if (!user.id) {
            throw new Error("User id is required")
        }
        this.zapProtectionService.ensureZapEligible({
            amountOriginal: sourceCoin.coinAmount,
            amountZapped: swapAmount,
            liquidityPoolId: pool.displayId,
            userId: user.id,
            requireZapEligible,
        })
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
            fromAddress: accountAddress,
            quoteData,
            routerId,
            network,
            slippage: swapSlippage,
            inputCoin: spendCoin,
            transferCoinObjs: false,
        })
        if (!coinOut) {
            throw new Error("Coin out is required")
        }
        const providedCoinA = priorityAOverB
            ? sourceCoin
            : coinOut
        const providedCoinB = priorityAOverB
            ? coinOut
            : sourceCoin
        const liquidityAmount = ClmmPoolUtil.estimateLiquidityFromcoinAmounts(
            pool.currentSqrtPrice,
            tickLower,
            tickUpper,
            {
                coinA: providedCoinA.coinAmount,
                coinB: providedCoinB.coinAmount,
            },
        )
        const addLiquidityParams: AddLiquidityParams = {
            delta_liquidity: liquidityAmount.toString(),
            coinTypeA: tokenA.tokenAddress,
            coinTypeB: tokenB.tokenAddress,
            collect_fee: true,
            max_amount_a: providedCoinA.coinAmount.toString(),
            max_amount_b: providedCoinB.coinAmount.toString(),
            pool_id: pool.poolAddress,
            tick_lower: tickLower.toString(),
            tick_upper: tickUpper.toString(),
            rewarder_coin_types: [],
            pos_id: "",
        }
        const inputCoinA = priorityAOverB ? sourceCoin : coinOut
        const inputCoinB = priorityAOverB ? coinOut : sourceCoin
        const txbAfterOpenPosition =
            await cetusClmmSdk.Position.createAddLiquidityPayload(
                addLiquidityParams,
                txb,
                inputCoinA?.coinArg,
                inputCoinB?.coinArg,
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
                    transaction: txbAfterOpenPosition,
                    suiClient,
                    signer,
                    stimulateOnly,
                    handleObjectChanges,
                })
            },
        })
        return {
            txHash,
            tickLower,
            tickUpper,
            liquidity: liquidityAmount,
            positionId,
            depositAmount,
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
        user,
        suiClient,
        slippage,
        accountAddress,
        stimulateOnly = false,
    }: ClosePositionParams): Promise<ClosePositionResponse> {
        if (!user) {
            throw new Error("Sui key pair is required")
        }
        slippage = slippage || CLOSE_POSITION_SLIPPAGE
        suiClient = suiClient || this.suiClients[network][clientIndex]
        txb = txb ?? new Transaction()
        const cetusClmmSdk = this.cetusClmmSdks[network]
        cetusClmmSdk.senderAddress = accountAddress

        const tokenA = this.memDbService.tokens.find((token) => token.displayId === tokenAId)
        const tokenB = this.memDbService.tokens.find((token) => token.displayId === tokenBId)
        if (!tokenA || !tokenB) {
            throw new Error("Token not found")
        }

        // 1. Compute min_amount based on liquidity and TickMath
        const lowerTick = Number(position.tickLower)
        const upperTick = Number(position.tickUpper)

        const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(lowerTick)
        const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(upperTick)

        const liquidity = new BN(position.liquidity)
        const slippageTolerance = Percentage.fromDecimal(new Decimal(slippage)) // 5%
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

        const suiTokenOuts: Partial<Record<TokenId, BN>> = {}
        const handleEvents = (events: Array<SuiEvent>) => {
            for (const event of events) {
                if (
                    event.type.includes("::pool::CollectFeeEvent")
                    && event.transactionModule === "pool_script_v2"
                ) {
                    const { amount_a, amount_b } = event.parsedJson as {
                        amount_a: string;
                        amount_b: string;
                    }
                    incrementBnMap(suiTokenOuts, tokenAId, new BN(amount_a))
                    incrementBnMap(suiTokenOuts, tokenBId, new BN(amount_b))
                }
                if (event.type.includes("::pool::RemoveLiquidityEvent")) {
                    const { amount_a, amount_b } = event.parsedJson as {
                        amount_a: string;
                        amount_b: string;
                    }
                    incrementBnMap(suiTokenOuts, tokenAId, new BN(amount_a))
                    incrementBnMap(suiTokenOuts, tokenBId, new BN(amount_b))
                }
                if (event.type.includes("::pool::CollectRewardV2Event")) {
                    const { amount, rewarder_type } = event.parsedJson as {
                        amount: string;
                        rewarder_type: { name: string };
                    }
                    const token = this.memDbService.tokens.find((token) =>
                        token.tokenAddress.includes(rewarder_type.name),
                    )
                    if (!token) {
                        throw new Error("Token not found")
                    }
                    incrementBnMap(suiTokenOuts, token.displayId, new BN(amount))
                }
            }
        }
        const txHash = await this.signerService.withSuiSigner({
            user,
            network,
            action: async (signer) => {
                return await this.suiExecutionService.signAndExecuteTransaction({
                    transaction: txbAfterClosePosition,
                    suiClient,
                    stimulateOnly,
                    handleEvents,
                    signer,
                })
            },
        })
        return { txHash, suiTokenOuts: filterOutBnZero(suiTokenOuts) }
    }
}
