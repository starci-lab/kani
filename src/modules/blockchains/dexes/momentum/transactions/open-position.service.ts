import { LiquidityPoolState } from "../../../interfaces"
import {
    BotSchema,
    LoadBalancerName,
    MomentumLiquidityPoolMetadata,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import { Transaction } from "@mysten/sui/transactions"
import { Injectable } from "@nestjs/common"
import { InvalidPoolTokensException } from "@exceptions"
import Decimal from "decimal.js"
import {
    FeeToAddressNotFoundException,
    TargetOperationalGasAmountNotFoundException,
} from "@exceptions"
import { FeeService } from "../../../math"
import { SelectCoinsService } from "../../../tx-builder"
import BN from "bn.js"
import { ChainId } from "@modules/common"
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils"
import { adjustSlippage } from "@utils"
import { OPEN_POSITION_SLIPPAGE } from "../../constants"

@Injectable()
export class OpenPositionTxbService {
    constructor(
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly feeService: FeeService,
    private readonly selectCoinsService: SelectCoinsService,
    ) {}

    async createOpenPositionTxb({
        txb,
        state,
        tickLower,
        tickUpper,
        amountAMax,
        amountBMax,
        bot,
    }: CreateOpenPositionTxbParams): Promise<CreateOpenPositionTxbResponse> {
        txb = txb ?? new Transaction()
        const tokenA = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === state.static.tokenA.toString(),
        )
        const tokenB = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === state.static.tokenB.toString(),
        )
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException(
                "Either token A or token B is not in the pool",
            )
        }
        const feeToAddress =
      this.primaryMemoryStorageService.feeConfig.feeInfo?.[bot.chainId]
          ?.feeToAddress
        if (!feeToAddress) {
            throw new FeeToAddressNotFoundException("Fee to address not found")
        }
        const { feeAmount: feeAmountA, remainingAmount: remainingAmountA } =
      this.feeService.splitAmount({
          amount: amountAMax,
          chainId: bot.chainId,
      })
        const { feeAmount: feeAmountB, remainingAmount: remainingAmountB } =
      this.feeService.splitAmount({
          amount: amountBMax,
          chainId: bot.chainId,
      })
        // we check balances of tokenA and tokenB
        const targetOperationalAmount =
      this.primaryMemoryStorageService.gasConfig.gasAmountRequired[ChainId.Sui]
          ?.targetOperationalAmount
        if (!targetOperationalAmount) {
            throw new TargetOperationalGasAmountNotFoundException(
                ChainId.Sui,
                "Target operational gas amount not found",
            )
        }
        const { sourceCoin: sourceCoinA } =
      await this.selectCoinsService.fetchAndMergeCoins({
          loadBalancerName: LoadBalancerName.MomentumClmm,
          txb,
          owner: bot.accountAddress,
          coinType: tokenA.tokenAddress,
          requiredAmount: amountAMax,
          suiGasAmount: new BN(targetOperationalAmount),
      })
        const { sourceCoin: sourceCoinB } =
      await this.selectCoinsService.fetchAndMergeCoins({
          loadBalancerName: LoadBalancerName.MomentumClmm,
          txb,
          owner: bot.accountAddress,
          coinType: tokenB.tokenAddress,
          requiredAmount: amountBMax,
          suiGasAmount: new BN(targetOperationalAmount),
      })
        const { spendCoin: feeCoinA } = this.selectCoinsService.splitCoin({
            txb,
            sourceCoin: sourceCoinA,
            requiredAmount: feeAmountA,
        })
        const { spendCoin: feeCoinB } = this.selectCoinsService.splitCoin({
            txb,
            sourceCoin: sourceCoinB,
            requiredAmount: feeAmountB,
        })
        txb.transferObjects([feeCoinA.coinArg, feeCoinB.coinArg], feeToAddress)
        const { packageId, versionObject } = state.static
            .metadata as MomentumLiquidityPoolMetadata
        const [lowerTick1] = txb.moveCall({
            target: `${packageId}::tick_math::get_tick_at_sqrt_price`,
            arguments: [txb.pure.u128(BigInt(tickLower.toNumber()))],
        })
        const [upperTick1] = txb.moveCall({
            target: `${packageId}::tick_math::get_tick_at_sqrt_price`,
            arguments: [txb.pure.u128(BigInt(tickUpper.toNumber()))],
        })
        const [tick_spacing] = txb.moveCall({
            target: `${packageId}::i32::from_u32`,
            arguments: [txb.pure.u32(state.static.tickSpacing)],
        })
        const [lowerTickmod] = txb.moveCall({
            target: `${packageId}::i32::mod`,
            arguments: [lowerTick1, tick_spacing],
        })

        const [upperTickmod] = txb.moveCall({
            target: `${packageId}::i32::mod`,
            arguments: [upperTick1, tick_spacing],
        })
        const [upperTick] = txb.moveCall({
            target: `${packageId}::i32::sub`,
            arguments: [upperTick1, upperTickmod],
        })

        const [lowerTick] = txb.moveCall({
            target: `${packageId}::i32::sub`,
            arguments: [lowerTick1, lowerTickmod],
        })
        const [positionObj] = txb.moveCall({
            target: `${packageId}::liquidity::open_position`,
            arguments: [
                txb.object(state.static.poolAddress),
                txb.object(lowerTick),
                txb.object(upperTick),
                txb.object(versionObject),
            ],
            typeArguments: [tokenA.tokenAddress, tokenB.tokenAddress],
        })
        txb.transferObjects([positionObj], txb.pure.address(bot.accountAddress))
        const [coinAOut, coinBOut] = txb.moveCall({
            target: `${packageId}::liquidity::add_liquidity`,
            typeArguments: [tokenA.tokenAddress, tokenB.tokenAddress],
            arguments: [
                txb.object(state.static.poolAddress),
                txb.object(positionObj),
                txb.object(sourceCoinA.coinArg),
                txb.object(sourceCoinB.coinArg),
                txb.pure.u64(
                    adjustSlippage(remainingAmountA, OPEN_POSITION_SLIPPAGE).toString(),
                ),
                txb.pure.u64(
                    adjustSlippage(remainingAmountB, OPEN_POSITION_SLIPPAGE).toString(),
                ),
                txb.object(SUI_CLOCK_OBJECT_ID),
                txb.object(versionObject),
            ],
        })
        txb.transferObjects([coinAOut, coinBOut], bot.accountAddress)
        txb.transferObjects([positionObj], bot.accountAddress)
        return {
            txb,
            feeAmountA,
            feeAmountB,
        }
    }
}

export interface CreateOpenPositionTxbParams {
  txb: Transaction;
  state: LiquidityPoolState;
  tickLower: Decimal;
  tickUpper: Decimal;
  amountAMax: BN;
  amountBMax: BN;
  bot: BotSchema;
  liquidity: BN;
}

export interface CreateOpenPositionTxbResponse {
  txb: Transaction;
  feeAmountA: BN;
  feeAmountB: BN;
}
