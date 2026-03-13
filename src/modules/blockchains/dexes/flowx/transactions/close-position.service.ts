import { 
    BotSchema, 
    FlowXLiquidityPoolMetadata, 
    LiquidityPoolSchema, 
    PrimaryMemoryStorageService
} from "@modules/databases"
import {
    DayjsService 
} from "@modules/mixin"
import {
    Injectable 
} from "@nestjs/common"
import {
    Transaction 
} from "@mysten/sui/transactions"
import {
    InvalidPoolTokensException, 
    LiquidityPoolClmmStateNotFoundException,
    ActivePositionNotFoundException
} from "@modules/exceptions"
import {
    SUI_CLOCK_OBJECT_ID 
} from "@mysten/sui/utils"
import {
    ClmmSqrtPriceMath, ClmmTickMath, MaxUint64 
} from "@flowx-finance/sdk"
import {
    Decimal 
} from "decimal.js"
import BN from "bn.js"
import {
    ZERO_BN 
} from "@modules/common"
import {
    ClmmLiquidityPoolState 
} from "../../../types"
import {
    CreateClosePositionTxbParams,
    CreateClosePositionTxbResult
} from "../types"

/**
 * Service responsible for creating close position transaction builders for FlowX.
 * Handles transaction construction for closing liquidity positions.
 *
 * @example
 * const service = new ClosePositionTxbService(...)
 * const result = await service.createClosePositionTxb({ bot, state })
 */
@Injectable()
export class ClosePositionTxbService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly dayjsService: DayjsService,
    ) {}

    async createClosePositionTxb(
        {
            txb,
            bot,
            state,
            liquidityPool,
        }: CreateClosePositionTxbParams
    ): Promise<CreateClosePositionTxbResult> {
        const _state = state as ClmmLiquidityPoolState
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        if (!bot.activePosition.associatedPosition.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        txb = txb ?? new Transaction()
        txb.setSender(bot.accountAddress)
        const tokenA = this.primaryMemoryStorageService.tokenMap.get(liquidityPool.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokenMap.get(liquidityPool.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        const {
            packageId,
            poolRegistryObject,
            versionObject,
            positionRegistryObject
        } = liquidityPool.metadata as FlowXLiquidityPoolMetadata
        const deadline = this.dayjsService.now().add(
            100,
            "year"
        ).utc().valueOf().toString()
        txb.moveCall({
            target: `${packageId}::position_manager::decrease_liquidity`,
            typeArguments: [
                tokenA.tokenAddress, 
                tokenB.tokenAddress
            ],
            arguments: [
                txb.object(poolRegistryObject),
                txb.object(bot.activePosition.associatedPosition.positionId),
                txb.pure.u128(bot.activePosition.associatedPosition.clmmState.liquidity.toString()),
                txb.pure.u64(
                    this.computeAmountX(
                        bot,
                        _state,
                        liquidityPool
                    ).toString()),
                txb.pure.u64(this.computeAmountY(
                    bot,
                    _state,
                    liquidityPool
                ).toString()),
                txb.pure.u64(deadline),
                txb.object(versionObject),
                txb.object(SUI_CLOCK_OBJECT_ID),
            ],
        })
        const txResult = txb.moveCall({
            target: `${packageId}::position_manager::collect`,
            typeArguments: [
                tokenA.tokenAddress,
                tokenB.tokenAddress
            ],
            arguments: [
                txb.object(poolRegistryObject),
                txb.object(bot.activePosition.associatedPosition.positionId),
                txb.pure.u64(MaxUint64.toString()),
                txb.pure.u64(MaxUint64.toString()),
                txb.object(versionObject),
                txb.object(SUI_CLOCK_OBJECT_ID),
            ],
        })
        txb.transferObjects(
            [
                txResult[0], 
                txResult[1]
            ], 
            bot.accountAddress
        )
        const rewardTokens = _state.rewards
        for (const rewardToken of rewardTokens) {
            const rewardTxResult = txb.moveCall({
                target: `${packageId}::position_manager::collect_pool_reward`,
                typeArguments: [
                    tokenA.tokenAddress,
                    tokenB.tokenAddress,
                    rewardToken.tokenAddress
                ],
                arguments: [
                    txb.object(poolRegistryObject),
                    txb.object(bot.activePosition.associatedPosition.positionId),
                    txb.pure.u64(MaxUint64.toString()),
                    txb.object(versionObject),
                    txb.object(SUI_CLOCK_OBJECT_ID),
                ],
            })
            txb.transferObjects([rewardTxResult[0]],
                bot.accountAddress)
        }
        txb.moveCall({
            target: `${packageId}::position_manager::close_position`,
            arguments: [
                txb.object(positionRegistryObject),
                txb.object(bot.activePosition.associatedPosition.positionId),
                txb.object(versionObject),
            ],
        })
        return {
            txb,
        }
    }

    /**
     * Compute the amount X for the close position.
     * @param bot - The bot schema.
     * @param state - The liquidity pool state.
     * @param liquidityPool - The liquidity pool schema.
     * @returns The amount X.
     */
    public computeAmountX(
        bot: BotSchema, 
        state: ClmmLiquidityPoolState,
        liquidityPool: LiquidityPoolSchema,
    ): BN {
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        if (!bot.activePosition.associatedPosition.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        if (new Decimal(state.tickCurrent.toString()).lt(new Decimal(bot.activePosition.associatedPosition.clmmState?.tickLower))) {
            return ClmmSqrtPriceMath.getAmountXDelta(
                ClmmTickMath.tickIndexToSqrtPriceX64(bot.activePosition.associatedPosition.clmmState.tickLower),
                ClmmTickMath.tickIndexToSqrtPriceX64(bot.activePosition.associatedPosition.clmmState?.tickUpper),
                new BN(bot.activePosition.associatedPosition.clmmState.liquidity),
                false
            )
        } else if (
            new Decimal(state.tickCurrent.toString()).lt(new Decimal(bot.activePosition.associatedPosition.clmmState?.tickUpper))
        ) {
            return ClmmSqrtPriceMath.getAmountXDelta(
                state.sqrtPriceX64,
                ClmmTickMath.tickIndexToSqrtPriceX64(bot.activePosition.associatedPosition.clmmState.tickUpper),
                new BN(bot.activePosition.associatedPosition.clmmState.liquidity),
                false
            )
        } else {
            return ZERO_BN
        }
    }

    /**
     * Compute the amount Y for the close position.
     * @param bot - The bot schema.
     * @param state - The liquidity pool state.
     * @param liquidityPool - The liquidity pool schema.
     * @returns The amount Y.
     */
    public computeAmountY(
        bot: BotSchema, 
        state: ClmmLiquidityPoolState,
        liquidityPool: LiquidityPoolSchema,
    ): BN {
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        if (!bot.activePosition.associatedPosition.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        if (new Decimal(state.tickCurrent.toString()).lt(new Decimal(bot.activePosition.associatedPosition.clmmState.tickLower))) {
            return ZERO_BN
        } else if (new Decimal(state.tickCurrent.toString()).lt(new Decimal(bot.activePosition.associatedPosition.clmmState.tickUpper))) {
            return ClmmSqrtPriceMath.getAmountYDelta(
                ClmmTickMath.tickIndexToSqrtPriceX64(bot.activePosition.associatedPosition.clmmState.tickLower),
                state.sqrtPriceX64,
                new BN(bot.activePosition.associatedPosition.clmmState.liquidity),
                false
            )
        } else {
            return ClmmSqrtPriceMath.getAmountYDelta(
                ClmmTickMath.tickIndexToSqrtPriceX64(bot.activePosition.associatedPosition.clmmState.tickLower),
                ClmmTickMath.tickIndexToSqrtPriceX64(bot.activePosition.associatedPosition.clmmState.tickUpper),
                new BN(bot.activePosition.associatedPosition.clmmState.liquidity),
                false
            )
        }
    }
}
