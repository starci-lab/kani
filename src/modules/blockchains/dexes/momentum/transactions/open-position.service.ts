import {
    ClmmLiquidityPoolState 
} from "../../../interfaces"
import {
    BotSchema,
    MomentumLiquidityPoolMetadata,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    Transaction 
} from "@mysten/sui/transactions"
import {
    Injectable 
} from "@nestjs/common"
import {
    InvalidPoolTokensException, 
    LiquidityPoolClmmStateNotFoundException
} from "@modules/exceptions"
import Decimal from "decimal.js"
import {
    FeeToAddressNotFoundException,
    TargetOperationalGasAmountNotFoundException,
} from "@modules/exceptions"
import {
    FeeService 
} from "../../../math"
import {
    SelectCoinsService 
} from "../../../tx-builder"
import BN from "bn.js"
import {
    ChainId 
} from "@modules/typedefs"
import {
    SUI_CLOCK_OBJECT_ID 
} from "@mysten/sui/utils"
import {
    adjustSlippage 
} from "@modules/utils"
import {
    TickMath 
} from "@mmt-finance/clmm-sdk"
import {
    MountStorageService 
} from "@modules/filesystem"
import {
    envConfig 
} from "@modules/env"
import {
    CreateOpenPositionTxbParams,
    CreateOpenPositionTxbResult
} from "../types"

/**
 * Service responsible for creating open position transaction builders for Momentum.
 * Handles transaction construction for opening liquidity positions.
 *
 * @example
 * const service = new OpenPositionTxbService(...)
 * const result = await service.createOpenPositionTxb({ bot, state, tickLower, tickUpper, amountA, amountB })
 */
@Injectable()
export class OpenPositionTxbService {
    constructor(
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly feeService: FeeService,
    private readonly selectCoinsService: SelectCoinsService,
    private readonly mountStorageService: MountStorageService,
    ) {}

    async createOpenPositionTxb({
        txb,
        state,
        tickLower,
        tickUpper,
        amountA,
        amountB,
        bot,
    }: CreateOpenPositionTxbParams): Promise<CreateOpenPositionTxbResult> {
        txb = txb ?? new Transaction()
        txb.setSender(bot.accountAddress)
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: state.static.tokenA.toString(),
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: state.static.tokenB.toString(),
        })
        if (!state.static.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException({
                liquidityPoolId: state.static.displayId,
            })
        }
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException(
                {
                    liquidityPoolId: state.static.displayId,
                }
            )
        }
        const feeToAddress = this.mountStorageService.appConfig.fees.openPosition.sui.feeToAddress
        if (!feeToAddress) {
            throw new FeeToAddressNotFoundException({
                feeToAddress,
            })
        }
        const { feeAmount: feeAmountA, remainingAmount: remainingAmountA } =
      this.feeService.splitAmount({
          amount: amountA,
          chainId: bot.chainId,
      })
        const { feeAmount: feeAmountB, remainingAmount: remainingAmountB } =
      this.feeService.splitAmount({
          amount: amountB,
          chainId: bot.chainId,
      })
        // we check balances of tokenA and tokenB
        const targetOperationalAmount =
      this.primaryMemoryStorageService.gasConfig.gasAmountRequired[ChainId.Sui]
          ?.targetOperationalAmount
        if (!targetOperationalAmount) {
            throw new TargetOperationalGasAmountNotFoundException(
                {
                    chainId: ChainId.Sui,
                }
            )
        }
        const { sourceCoin: sourceCoinA } =
      await this.selectCoinsService.fetchAndMergeCoins({
          txb,
          owner: bot.accountAddress,
          coinType: tokenA.tokenAddress,
          requiredAmount: amountA,
          suiGasAmount: new BN(targetOperationalAmount),
      })
        const { sourceCoin: sourceCoinB } =
      await this.selectCoinsService.fetchAndMergeCoins({
          txb,
          owner: bot.accountAddress,
          coinType: tokenB.tokenAddress,
          requiredAmount: amountB,
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
        txb.transferObjects([feeCoinA.coinArg,
            feeCoinB.coinArg],
        feeToAddress)
        const { packageId, versionObject } = state.static
            .metadata as MomentumLiquidityPoolMetadata
        const slippage = new Decimal(envConfig().dexes.momentum.openPosition.slippage)
        const [lowerTick1] = txb.moveCall({
            target: `${packageId}::tick_math::get_tick_at_sqrt_price`,
            arguments: [txb.pure.u128(TickMath.tickIndexToSqrtPriceX64(tickLower.toNumber()).toString())],
        })
        const [upperTick1] = txb.moveCall({
            target: `${packageId}::tick_math::get_tick_at_sqrt_price`,
            arguments: [txb.pure.u128(TickMath.tickIndexToSqrtPriceX64(tickUpper.toNumber()).toString())],
        })
        const [tick_spacing] = txb.moveCall({
            target: `${packageId}::i32::from_u32`,
            arguments: [txb.pure.u32(state.static.clmmState.tickSpacing)],
        })
        const [lowerTickmod] = txb.moveCall({
            target: `${packageId}::i32::mod`,
            arguments: [lowerTick1,
                tick_spacing],
        })

        const [upperTickmod] = txb.moveCall({
            target: `${packageId}::i32::mod`,
            arguments: [upperTick1,
                tick_spacing],
        })
        const [upperTick] = txb.moveCall({
            target: `${packageId}::i32::sub`,
            arguments: [upperTick1,
                upperTickmod],
        })

        const [lowerTick] = txb.moveCall({
            target: `${packageId}::i32::sub`,
            arguments: [lowerTick1,
                lowerTickmod],
        })
        const [positionObj] = txb.moveCall({
            target: `${packageId}::liquidity::open_position`,
            arguments: [
                txb.object(state.static.poolAddress),
                txb.object(lowerTick),
                txb.object(upperTick),
                txb.object(versionObject),
            ],
            typeArguments: [tokenA.tokenAddress,
                tokenB.tokenAddress],
        })
        const [coinAOut,
            coinBOut] = txb.moveCall({
            target: `${packageId}::liquidity::add_liquidity`,
            typeArguments: [tokenA.tokenAddress,
                tokenB.tokenAddress],
            arguments: [
                txb.object(state.static.poolAddress),
                txb.object(positionObj),
                txb.object(sourceCoinA.coinArg),
                txb.object(sourceCoinB.coinArg),
                txb.pure.u64(
                    adjustSlippage({
                        bn: remainingAmountA,
                        slippage,
                        isRoundUp: false,
                    }).toString(),
                ),
                txb.pure.u64(
                    adjustSlippage({
                        bn: remainingAmountB,
                        slippage,
                        isRoundUp: false,
                    }).toString(),
                ),
                txb.object(SUI_CLOCK_OBJECT_ID),
                txb.object(versionObject),
            ],
        })
        txb.transferObjects([coinAOut,
            coinBOut],
        bot.accountAddress)
        txb.transferObjects([positionObj],
            bot.accountAddress)
        return {
            txb,
            feeAmountA,
            feeAmountB,
        }
    }
}

