import { Injectable, Logger } from "@nestjs/common"
import {
    ClosePositionParams,
    ClosePositionResponse,
    IActionService,
    OpenPositionParams,
    OpenPositionResponse,
} from "../../interfaces"
import { InjectTurbosClmmSdks } from "./turbos.decorators"
import {
    computePercentage,
    computeRatio,
    computeRaw,
    filterOutBnZero,
    incrementBnMap,
    MAX_UINT_64,
    Network,
    toUnit,
} from "@modules/common"
import { TurbosSdk } from "turbos-clmm-sdk"
import { TickManagerService } from "../../utils"
import { TickMathService } from "../../utils"
import BN from "bn.js"
import Decimal from "decimal.js"
import { SuiCoinManagerService } from "../../utils"
import { Transaction } from "@mysten/sui/transactions"
import {
    CLOSE_POSITION_SLIPPAGE,
    OPEN_POSITION_SLIPPAGE,
    SuiSwapService,
    SWAP_OPEN_POSITION_SLIPPAGE,
    ZapService,
} from "../../swap"
import { SuiClient, SuiEvent, SuiObjectChange } from "@mysten/sui/client"
import { GasSuiSwapUtilsService } from "../../swap"
import { clientIndex } from "./inner-constants"
import { SuiExecutionService } from "../../utils"
import { PythService } from "../../pyth"
import { SignerService } from "../../signers"
import { InjectSuiClients } from "../../clients"
import { FeeToService } from "../../swap"
import { TokenId } from "@modules/databases"
import { DayjsService } from "@modules/mixin"   
import { ZapProtectionService } from "../../utils"

@Injectable()
export class TurbosActionService implements IActionService {
    private readonly logger = new Logger(TurbosActionService.name)
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
        private readonly zapProtectionService: ZapProtectionService,
        private readonly suiExecutionService: SuiExecutionService,
        private readonly signerService: SignerService,
        @InjectSuiClients()
        private readonly suiClients: Record<Network, Array<SuiClient>>,
        private readonly dayjsService: DayjsService,
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
        requireZapEligible = true,
        stimulateOnly = false,
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
        const { sourceCoin } = await this.gasSuiSwapUtilsService.gasSuiSwap({
            network,
            accountAddress,
            amountIn: amount,
            tokenInId: tokenIn.displayId,
            tokens,
            slippage,
            suiClient,
            txb,
        })
        this.logger.debug(`Source coin after gas swap: ${sourceCoin.coinAmount.toString()}`)
        // this is the deposit amount
        const depositAmount = sourceCoin.coinAmount
        await this.feeToService.attachSuiFee({
            txb,
            tokenId: tokenIn.displayId,
            tokens,
            network,
            amount: sourceCoin.coinAmount,
            sourceCoin,
        })
        this.logger.debug(`Source coin after fee to: ${sourceCoin.coinAmount.toString()}`)
        // use this to calculate the ratio
        const quoteAmountA = computeRaw(1, tokenA.decimals)
        const [amountA, amountB] = turbosSdk.pool.estimateAmountsFromOneAmount({
            amount: quoteAmountA.toString(),
            isAmountA: true,
            sqrtPrice: pool.currentSqrtPrice.toString(),
            tickLower,
            tickUpper,
        })
        const ratio = computeRatio(
            new BN(amountB).mul(toUnit(tokenA.decimals)),
            new BN(amountA).mul(toUnit(tokenB.decimals)),
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
                tokens,
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
            throw new Error("Coin out is required")
        }
        this.logger.debug(`Swap amount: ${swapAmount.toString()}`)
        this.logger.debug(`Source coin after swap: ${sourceCoin.coinAmount.toString()}`)
        this.logger.debug(`Coin out after swap: ${coinOut.coinAmount.toString()}`)
        // we process add liquidity
        const providedCoinA = priorityAOverB ? sourceCoin : coinOut
        const providedCoinB = priorityAOverB ? coinOut : sourceCoin
        // we use cetus lib to determine turbos lib
        // since (maybe) the CLMM concepts use the same fomular
        let [computedAmountA, computedAmountB] =
            turbosSdk.pool.estimateAmountsFromOneAmount({
                sqrtPrice: pool.currentSqrtPrice.toString(),
                tickLower,
                tickUpper,
                amount: priorityAOverB
                    ? providedCoinA.coinAmount.toString()
                    : providedCoinB.coinAmount.toString(),
                isAmountA: priorityAOverB,
            })
        if (priorityAOverB) {
            if (new BN(computedAmountB).gt(providedCoinB.coinAmount)) {
                computedAmountA = new BN(computedAmountA)
                    .mul(providedCoinB.coinAmount)
                    .div(new BN(computedAmountB))
                    .toString()
                computedAmountB = providedCoinB.coinAmount.toString()
            }
        } else {
            if (new BN(computedAmountA).gt(providedCoinA.coinAmount)) {
                computedAmountB = new BN(computedAmountB)
                    .mul(providedCoinA.coinAmount)
                    .div(new BN(computedAmountA))
                    .toString()
                computedAmountA = providedCoinA.coinAmount.toString()
            }
        }
        this.logger.debug(`Computed amount A: ${computedAmountA}`)
        this.logger.debug(`Computed amount B: ${computedAmountB}`)
        this.logger.debug(`Provided coin A: ${providedCoinA.coinAmount.toString()}`)
        this.logger.debug(`Provided coin B: ${providedCoinB.coinAmount.toString()}`)
        const txbAfterOpenPosition = await turbosSdk.pool.addLiquidity({
            pool: pool.poolAddress,
            address: accountAddress,
            amountA: computedAmountA,
            amountB: computedAmountB,
            tickLower,
            tickUpper,
            deadline: this.dayjsService.now().add(1, "hour").toDate().getTime(),
            slippage: computePercentage(slippage),
            txb,
            coinAObjectArguments: [providedCoinA.coinArg],
            coinBObjectArguments: [providedCoinB.coinArg],
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
                        obj.owner.AddressOwner.toLowerCase() ===
                        accountAddress.toLowerCase(),
                )
                .map((obj) => obj.objectId)
            positionId = positionObjId
        }
        let liquidity = new BN(0)
        const handleEvents = (events: Array<SuiEvent>) => {
            for (const event of events) {
                if (events.some((event) =>
                    event.type.includes("::position_manager::IncreaseLiquidityEvent")
                    && event.transactionModule === "position_manager"
                )) {
                    const { liquidity: liquidityString } = event.parsedJson as {
                        liquidity: string;
                    }
                    liquidity = new BN(liquidityString)
                }
            }
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
                    handleEvents,
                })
            },
        })
        return {
            txHash,
            tickLower,
            tickUpper,
            positionId,
            depositAmount,
            liquidity,
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
        stimulateOnly,
        suiClient,
    }: ClosePositionParams): Promise<ClosePositionResponse> {
        if (!user) {
            throw new Error("Sui key pair is required")
        }
        suiClient = suiClient || this.suiClients[network][clientIndex]
        // maximum slippage to ensure the transaction is successful
        slippage = slippage || CLOSE_POSITION_SLIPPAGE
        txb = txb || new Transaction()
        const turbosSdk = this.turbosClmmSdks[network]
        const tokenA = tokens.find((token) => token.displayId === tokenAId)
        const tokenB = tokens.find((token) => token.displayId === tokenBId)
        if (!tokenA || !tokenB) {
            throw new Error("Token not found")
        }
        const positionFields = await turbosSdk.position.getPositionFields(
            position.positionId,
        )
        const txbAfterRemoveLiquidity = await turbosSdk.pool.removeLiquidity({
            txb,
            nft: position.positionId,
            pool: pool.poolAddress,
            address: accountAddress,
            amountA: positionFields.tokens_owed_a,
            amountB: positionFields.tokens_owed_b,
            slippage: computePercentage(slippage),
            collectAmountA: MAX_UINT_64.toString(),
            collectAmountB: MAX_UINT_64.toString(),
            rewardAmounts: pool.rewardTokens.map(() => MAX_UINT_64.toString()),
            decreaseLiquidity: positionFields.liquidity,
            deadline: this.dayjsService.now().add(1, "hour").toDate().getTime(),
        })
        txbAfterRemoveLiquidity.setSender(accountAddress)
        const suiTokenOuts: Partial<Record<TokenId, BN>> = {}
        const handleEvents = (events: Array<SuiEvent>) => {
            for (const event of events) {
                if (event.type.includes("::pool::BurnEvent")) {
                    const { amount_a, amount_b } = event.parsedJson as {
                        amount_a: string;
                        amount_b: string;
                    }
                    incrementBnMap(suiTokenOuts, tokenAId, new BN(amount_a))
                    incrementBnMap(suiTokenOuts, tokenBId, new BN(amount_b))
                }
                if (event.type.includes("::pool::CollectEventV2")) {
                    const { amount_a, amount_b } = event.parsedJson as {
                        amount_a: string;
                        amount_b: string;
                    }
                    incrementBnMap(suiTokenOuts, tokenAId, new BN(amount_a))
                    incrementBnMap(suiTokenOuts, tokenBId, new BN(amount_b))
                }
                if (event.type.includes("::pool::CollectRewardEventV2")) {
                    const { amount, reward_type } = event.parsedJson as {
                        amount: string;
                        reward_type: { name: string };
                    }
                    const token = tokens.find((token) =>
                        token.tokenAddress.includes(reward_type.name),
                    )
                    if (token) {
                        incrementBnMap(suiTokenOuts, token.displayId, new BN(amount))
                    }
                }
            }
        }
        const txHash = await this.signerService.withSuiSigner({
            user,
            network,
            action: async (signer) => {
                return await this.suiExecutionService.signAndExecuteTransaction({
                    transaction: txbAfterRemoveLiquidity,
                    suiClient,
                    signer,
                    stimulateOnly,
                    handleEvents,
                })
            },
        })
        return {
            txHash,
            suiTokenOuts: filterOutBnZero(suiTokenOuts),
        }
    }
}
