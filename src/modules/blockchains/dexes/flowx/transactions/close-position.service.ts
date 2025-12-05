import { 
    BotSchema, 
    FlowXLiquidityPoolMetadata, 
    PrimaryMemoryStorageService
} from "@modules/databases"
import { DayjsService } from "@modules/mixin"
import { Injectable } from "@nestjs/common"
import { LiquidityPoolState } from "../../../interfaces"
import { Transaction } from "@mysten/sui/transactions"
import { InvalidPoolTokensException } from "src/exceptions/tokens"
import { ActivePositionNotFoundException } from "@exceptions"
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils"
import { ClmmSqrtPriceMath, ClmmTickMath, MaxUint64 } from "@flowx-finance/sdk"
import { Decimal } from "decimal.js"
import BN from "bn.js"
import { ZERO_BN } from "@utils"
import { RewardInfo } from "../struct"

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
    ): Promise<CreateClosePositionTxbResponse> {
        txb = txb ?? new Transaction()
        const tokenA = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === state.static.tokenA.toString()
        )
        const tokenB = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === state.static.tokenB.toString()
        )
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException("Active position not found")
        }
        const {
            packageId,
            poolRegistryObject,
            versionObject
        } = state.static.metadata as FlowXLiquidityPoolMetadata
        const deadline = this.dayjsService.now().add(5, "minute").utc().valueOf().toString()
        txb.moveCall({
            target: `${packageId}::position_manager::decrease_liquidity`,
            typeArguments: [
                tokenA.tokenAddress, 
                tokenB.tokenAddress
            ],
            arguments: [
                txb.object(poolRegistryObject),
                txb.object(bot.activePosition.positionId),
                txb.pure.u128(bot.activePosition.liquidity?.toString() || "0"),
                txb.pure.u64(this.computeAmountX(bot, state).toString()),
                txb.pure.u64(this.computeAmountY(bot, state).toString()),
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
                txb.object(bot.activePosition.positionId),
                txb.pure.u64(0),
                txb.pure.u64(0),
                txb.pure.u64(deadline),
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
        const rewardTokens = state.dynamic.rewards as Array<RewardInfo>
        const rewardTxResult = txb.moveCall({
            target: `${packageId}::position_manager::collect_pool_reward`,
            typeArguments: [
                tokenA.tokenAddress,
                tokenB.tokenAddress,
                rewardTokens[0].rewardCoinType
            ],
            arguments: [
                txb.object(poolRegistryObject),
                txb.object(bot.activePosition.positionId),
                txb.pure.u64(MaxUint64.toString()),
                txb.object(versionObject),
                txb.object(SUI_CLOCK_OBJECT_ID),
            ],
        })
        txb.transferObjects([rewardTxResult[0]], bot.accountAddress)
        txb.moveCall({
            target: `${packageId}::position_manager::close_position`,
            arguments: [
                txb.object(poolRegistryObject),
                txb.object(bot.activePosition.positionId),
                txb.object(versionObject),
            ],
        })
        return {
            txb,
        }
    }

    public computeAmountX(
        bot: BotSchema, 
        state: LiquidityPoolState
    ): BN {
        const activePosition = bot.activePosition
        if (!activePosition) {
            throw new ActivePositionNotFoundException("Active position not found")
        }
        if (new Decimal(state.dynamic.tickCurrent).lt(new Decimal(activePosition.tickLower || 0))) {
            return ClmmSqrtPriceMath.getAmountXDelta(
                ClmmTickMath.tickIndexToSqrtPriceX64(activePosition.tickLower || 0),
                ClmmTickMath.tickIndexToSqrtPriceX64(activePosition.tickUpper || 0),
                new BN(activePosition.liquidity || 0),
                false
            )
        } else if (
            new Decimal(state.dynamic.tickCurrent).lt(new Decimal(activePosition.tickUpper || 0))
        ) {
            return ClmmSqrtPriceMath.getAmountXDelta(
                new BN(state.dynamic.sqrtPriceX64),
                ClmmTickMath.tickIndexToSqrtPriceX64(activePosition.tickUpper || 0),
                new BN(activePosition.liquidity || 0),
                false
            )
        } else {
            return ZERO_BN
        }
    }

    public computeAmountY(
        bot: BotSchema, 
        state: LiquidityPoolState
    ): BN {
        const activePosition = bot.activePosition
        if (!activePosition) {
            throw new ActivePositionNotFoundException("Active position not found")
        }
        if (new Decimal(state.dynamic.tickCurrent).lt(new Decimal(activePosition.tickLower || 0))) {
            return ZERO_BN
        } else if (new Decimal(state.dynamic.tickCurrent).lt(new Decimal(activePosition.tickUpper || 0))) {
            return ClmmSqrtPriceMath.getAmountYDelta(
                ClmmTickMath.tickIndexToSqrtPriceX64(activePosition.tickLower || 0),
                new BN(state.dynamic.sqrtPriceX64),
                new BN(activePosition.liquidity || 0),
                false
            )
        } else {
            return ClmmSqrtPriceMath.getAmountYDelta(
                ClmmTickMath.tickIndexToSqrtPriceX64(activePosition.tickLower || 0),
                ClmmTickMath.tickIndexToSqrtPriceX64(activePosition.tickUpper || 0),
                new BN(activePosition.liquidity || 0),
                false
            )
        }
    }
}

export interface CreateClosePositionTxbParams {
    txb: Transaction
    bot: BotSchema
    state: LiquidityPoolState
}

export interface CreateClosePositionTxbResponse {
    txb: Transaction
}