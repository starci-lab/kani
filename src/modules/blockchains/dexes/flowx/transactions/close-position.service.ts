import { 
    BotSchema, 
    FlowXLiquidityPoolMetadata, 
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
    LiquidityPoolClmmStateNotFoundException
} from "@modules/exceptions"
import {
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
} from "@modules/utils"
import {
    ClmmLiquidityPoolState 
} from "../../../interfaces"

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
        }: CreateClosePositionTxbParams
    ): Promise<CreateClosePositionTxbResult> {
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        if (!bot.activePosition.associatedPosition.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException({
                liquidityPoolId: state.static.displayId,
            })
        }
        txb = txb ?? new Transaction()
        txb.setSender(bot.accountAddress)
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: state.static.tokenA.toString(),
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: state.static.tokenB.toString(),
        })
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: state.static.displayId,
            })
        }
        const {
            packageId,
            poolRegistryObject,
            versionObject,
            positionRegistryObject
        } = state.static.metadata as FlowXLiquidityPoolMetadata
        const deadline = this.dayjsService.now().add(5,
            "minute").utc().valueOf().toString()
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
                txb.pure.u64(this.computeAmountX(bot,
                    state).toString()),
                txb.pure.u64(this.computeAmountY(bot,
                    state).toString()),
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
        const rewardTokens = state.dynamic.rewards
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

    public computeAmountX(
        bot: BotSchema, 
        state: ClmmLiquidityPoolState
    ): BN {
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        if (!bot.activePosition.associatedPosition.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException({
                liquidityPoolId: state.static.displayId,
            })
        }
        if (new Decimal(state.dynamic.tickCurrent.toString()).lt(new Decimal(bot.activePosition.associatedPosition.clmmState?.tickLower))) {
            return ClmmSqrtPriceMath.getAmountXDelta(
                ClmmTickMath.tickIndexToSqrtPriceX64(bot.activePosition.associatedPosition.clmmState.tickLower),
                ClmmTickMath.tickIndexToSqrtPriceX64(bot.activePosition.associatedPosition.clmmState?.tickUpper),
                new BN(bot.activePosition.associatedPosition.clmmState.liquidity),
                false
            )
        } else if (
            new Decimal(state.dynamic.tickCurrent.toString()).lt(new Decimal(bot.activePosition.associatedPosition.clmmState?.tickUpper))
        ) {
            return ClmmSqrtPriceMath.getAmountXDelta(
                state.dynamic.sqrtPriceX64,
                ClmmTickMath.tickIndexToSqrtPriceX64(bot.activePosition.associatedPosition.clmmState.tickUpper),
                new BN(bot.activePosition.associatedPosition.clmmState.liquidity),
                false
            )
        } else {
            return ZERO_BN
        }
    }

    public computeAmountY(
        bot: BotSchema, 
        state: ClmmLiquidityPoolState
    ): BN {
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        if (!bot.activePosition.associatedPosition.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException({
                liquidityPoolId: state.static.displayId,
            })
        }
        if (new Decimal(state.dynamic.tickCurrent.toString()).lt(new Decimal(bot.activePosition.associatedPosition.clmmState.tickLower))) {
            return ZERO_BN
        } else if (new Decimal(state.dynamic.tickCurrent.toString()).lt(new Decimal(bot.activePosition.associatedPosition.clmmState.tickUpper))) {
            return ClmmSqrtPriceMath.getAmountYDelta(
                ClmmTickMath.tickIndexToSqrtPriceX64(bot.activePosition.associatedPosition.clmmState.tickLower),
                state.dynamic.sqrtPriceX64,
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

export interface CreateClosePositionTxbParams {
    txb?: Transaction
    bot: BotSchema
    state: ClmmLiquidityPoolState
}

export interface CreateClosePositionTxbResult {
    txb: Transaction
}