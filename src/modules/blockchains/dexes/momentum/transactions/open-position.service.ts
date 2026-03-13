import {
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
    TargetOperationalGasAmountNotFoundException,
} from "@modules/exceptions"
import {
    SelectCoinsService 
} from "../../../tx-builder"
import BN from "bn.js"
import {
    SUI_CLOCK_OBJECT_ID 
} from "@mysten/sui/utils"
import {
    ChainId,
    adjustSlippage 
} from "@modules/common"
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
    private readonly selectCoinsService: SelectCoinsService,
    private readonly mountStorageService: MountStorageService,
    ) {}

    async createOpenPositionTxb({
        txb,
        tickLower,
        tickUpper,
        amountA,
        amountB,
        bot,
        liquidityPool,
    }: CreateOpenPositionTxbParams): Promise<CreateOpenPositionTxbResult> {
        txb = txb ?? new Transaction()
        txb.setSender(bot.accountAddress)
        const tokenA = this.primaryMemoryStorageService.tokenMap.get(liquidityPool.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokenMap.get(liquidityPool.tokenB.toString())
        if (!liquidityPool.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException(
                {
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
        }
        const remainingAmountA = new BN(amountA)
        const remainingAmountB = new BN(amountB)
        // we check balances of tokenA and tokenB
        const targetOperationalAmount =
      this.mountStorageService.appConfig.gas.gasAmountRequired[ChainId.Sui]
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
        const { packageId, versionObject } = liquidityPool.metadata as MomentumLiquidityPoolMetadata

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
            arguments: [txb.pure.u32(liquidityPool.clmmState.tickSpacing)],
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
                txb.object(liquidityPool.poolAddress),
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
                txb.object(liquidityPool.poolAddress),
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
        }
    }
}

