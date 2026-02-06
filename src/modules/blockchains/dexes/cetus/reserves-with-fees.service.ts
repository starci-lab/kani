import {
    ReservesWithFeesParams,
    ReservesWithFeesResult,
    IReservesWithFeesService,
    ClmmLiquidityPoolState,
} from "../types"
import {
    Injectable,
} from "@nestjs/common"
import {
    RpcExecutorService,
} from "../../clients"
import {
    ActivePositionNotFoundException,
    InvalidPoolTokensException,
    SuiObjectNotFoundException,
    ErrorSuiObjectName,
    InvalidTickScoreException,
    LiquidityPoolClmmStateNotFoundException,
    TokenNotFoundException,
} from "@modules/exceptions"
import BN from "bn.js"
import {
    Q128,
    Q64,
} from "@modules/utils"
import {
    RpcAccessType,
} from "@modules/filesystem"
import Decimal from "decimal.js"
import {
    CetusSuiObjectPositionInfoFields,
    CetusSuiObjectTickFields,
    CetusSuiSkipListNodeFields,
    parseCetusPositionInfo,
    parseCetusTick,
} from "./struct"
import {
    SuiMoveObjectData,
} from "../../types"
import {
    ClmmFeesFormulaService,
    ClmmRewardsFormulaService,
    ClmmReservesFormulaService,
} from "../../formulas"
import {
    DynamicClmmRewardInfo,
} from "@modules/cache"
import {
    CetusLiquidityPoolMetadata,
    DexId,
    PrimaryMemoryStorageService,
} from "@modules/databases"

/**
 * Service responsible for calculating reserves with fees for Cetus positions.
 * Fetches on-chain data and computes reserves, fees, and rewards.
 *
 * @example
 * const service = new CetusReservesWithFeesService(...)
 * const result = await service.reservesWithFees({ state, bot })
 */
@Injectable()
export class CetusReservesWithFeesService implements IReservesWithFeesService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly clmmFeesFormulaService: ClmmFeesFormulaService,
        private readonly clmmRewardsFormulaService: ClmmRewardsFormulaService,
        private readonly clmmReservesFormulaService: ClmmReservesFormulaService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Calculates reserves with fees for a position.
     * Fetches on-chain tick and position info, then computes reserves, fees, and rewards.
     *
     * @param param - Parameters for calculating reserves with fees
     * @param param.state - CLMM liquidity pool state
     * @param param.bot - Bot schema
     * @returns Calculated reserves, fees, and rewards
     *
     * @example
     * const result = await service.reservesWithFees({ state, bot })
     */
    async reservesWithFees({ state, bot }: ReservesWithFeesParams): Promise<ReservesWithFeesResult> {
        const _state = state as ClmmLiquidityPoolState
        
        // validate active position exists
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        
        // validate position has CLMM state
        if (!bot.activePosition.associatedPosition.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException({
                liquidityPoolId: _state.static.displayId,
            })
        }
        
        // fetch pool token metadata
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: _state.static.tokenA.toString(),
            },
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: _state.static.tokenB.toString(),
            },
        })
        
        // validate tokens exist
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: _state.static.displayId,
            })
        }
        
        // extract position and tick information
        const { positionId } = bot.activePosition.associatedPosition
        const tickLower = new BN(bot.activePosition.associatedPosition.clmmState.tickLower)
        const tickUpper = new BN(bot.activePosition.associatedPosition.clmmState.tickUpper)
        const lowerScore = this.tickScore({
            tick: tickLower 
        })
        const upperScore = this.tickScore({
            tick: tickUpper 
        })
        const { tickManagerId, positionManagerId } = _state.static.metadata as CetusLiquidityPoolMetadata
        // fetch tick lower dynamic field from on-chain
        const { data: tickLowerDataRaw } = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                return suiClient.getDynamicFieldObject({
                    parentId: tickManagerId,
                    name: {
                        type: "u64",
                        value: lowerScore.toString(),
                    },
                })
            },
        })
        
        // validate tick lower data exists
        if (!tickLowerDataRaw) {
            throw new SuiObjectNotFoundException({
                name: ErrorSuiObjectName.TickLower,
                parentId: tickManagerId,
                dexId: DexId.Cetus,
                liquidityPoolId: _state.static.displayId,
            })
        }
        
        // parse tick lower data
        const _tickLowerData = tickLowerDataRaw as unknown as SuiMoveObjectData<
            CetusSuiSkipListNodeFields<CetusSuiObjectTickFields, `${string}::tick::Tick`>
        >
        const tickLowerData = parseCetusTick(_tickLowerData.content.fields.value.fields.value.fields)
        
        // fetch tick upper dynamic field from on-chain
        const { data: tickUpperDataRaw } = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                return suiClient.getDynamicFieldObject({
                    parentId: tickManagerId,
                    name: {
                        type: "u64",
                        value: upperScore.toString(),
                    },
                })
            },
        })
        
        // validate tick upper data exists
        if (!tickUpperDataRaw) {
            throw new SuiObjectNotFoundException({
                name: ErrorSuiObjectName.TickUpper,
                parentId: tickManagerId,
                dexId: DexId.Cetus,
                liquidityPoolId: _state.static.displayId,
            })
        }
        
        // parse tick upper data
        const _tickUpperData = tickUpperDataRaw as unknown as SuiMoveObjectData<
            CetusSuiSkipListNodeFields<CetusSuiObjectTickFields, `${string}::tick::Tick`>
        >
        const tickUpperData = parseCetusTick(_tickUpperData.content.fields.value.fields.value.fields)
        
        // fetch position info dynamic field from on-chain
        const { data: positionInfoDataRaw } = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                return suiClient.getDynamicFieldObject({
                    parentId: positionManagerId,
                    name: {
                        type: "0x2::object::ID",
                        value: positionId,
                    },
                })
            },
        })
        
        // validate position info exists
        if (!positionInfoDataRaw) {
            throw new SuiObjectNotFoundException({
                name: ErrorSuiObjectName.PositionInfo,
                parentId: positionManagerId,
                dexId: DexId.Cetus,
                liquidityPoolId: _state.static.displayId,
            })
        }
        
        // parse position info data
        const _positionInfoData = positionInfoDataRaw as unknown as SuiMoveObjectData<
            CetusSuiSkipListNodeFields<CetusSuiObjectPositionInfoFields, `${string}::position::PositionInfo`>
        >
        const positionInfoData = parseCetusPositionInfo(
            _positionInfoData.content.fields.value.fields.value.fields
        )

        // convert ticks to BN for calculations
        const tickLowerBn = new BN(tickLower.toNumber())
        const tickUpperBn = new BN(tickUpper.toNumber())

        // calculate reserves
        const { reserveA, reserveB } = this.clmmReservesFormulaService.computeReserves({
            tickLower: tickLowerBn,
            tickUpper: tickUpperBn,
            tickCurrent: _state.dynamic.tickCurrent,
            liquidity: positionInfoData.liquidity,
            decimalsA: new Decimal(tokenA.decimals),
            decimalsB: new Decimal(tokenB.decimals),
            fixedPointScale: Q64,
        })

        // calculate fees
        const { feeA, feeB } = this.clmmFeesFormulaService.computeFees({
            feeGrowthGlobalA: _state.dynamic.feeGrowthGlobalA,
            feeGrowthGlobalB: _state.dynamic.feeGrowthGlobalB,
            feeGrowthOutsideLowerA: new BN(tickLowerData.feeGrowthOutsideA.toString()),
            feeGrowthOutsideUpperA: new BN(tickUpperData.feeGrowthOutsideA.toString()),
            feeGrowthOutsideLowerB: new BN(tickLowerData.feeGrowthOutsideB.toString()),
            feeGrowthOutsideUpperB: new BN(tickUpperData.feeGrowthOutsideB.toString()),
            tickCurrent: _state.dynamic.tickCurrent,
            tickLower: tickLowerBn,
            tickUpper: tickUpperBn,
            feeGrowthInsideLastA: positionInfoData.feeGrowthInsideA,
            feeGrowthInsideLastB: positionInfoData.feeGrowthInsideB,
            liquidity: positionInfoData.liquidity,
            feeOwnedA: positionInfoData.feeOwnedA,
            feeOwnedB: positionInfoData.feeOwnedB,
            outsideDeltaWrapModulus: Q128,
            insideDeltaWrapModulus: Q128,
            resultDiv: Q64,
            decimalsA: new Decimal(tokenA.decimals),
            decimalsB: new Decimal(tokenB.decimals),
        })

        // calculate rewards (CLMM time-based)
        const clmmRewards = _state.dynamic.rewards as Array<DynamicClmmRewardInfo>
        const rewards = Object.fromEntries(
            clmmRewards.map((clmmReward, index) => {
                // fetch token metadata for reward
                const { tokenAddress } = clmmReward
                const token = this.primaryMemoryStorageService.tokenCollection.findOne({
                    tokenAddress: {
                        $eq: tokenAddress,
                    },
                })
                
                // validate token exists
                if (!token) {
                    throw new TokenNotFoundException({
                        tokenAddress,
                    })
                }
                
                // compute reward amount
                const posReward = positionInfoData.rewards[index]
                const rewardAmount = this.clmmRewardsFormulaService.computeReward({
                    rewardGrowthGlobal: new BN(clmmReward.growthGlobal.toString()),
                    rewardGrowthOutsideLower: new BN(tickLowerData.rewardsGrowthOutside[index].toString()),
                    rewardGrowthOutsideUpper: new BN(tickUpperData.rewardsGrowthOutside[index].toString()),
                    tickCurrent: _state.dynamic.tickCurrent,
                    tickLower: tickLowerBn,
                    tickUpper: tickUpperBn,
                    rewardGrowthInsideLast: posReward.growthInside,
                    liquidity: positionInfoData.liquidity,
                    decimals: new Decimal(token.decimals),
                    rewardOwned: posReward.amountOwned,
                    emissionsPerSecond: new BN(clmmReward.emissionPerSecond.toString()),
                    lastUpdateMs: _state.dynamic.rewardLastUpdatedTimeMs ?? new BN(0),
                    totalLiquidity: new BN(_state.dynamic.liquidity.toString()),
                })
                
                return [
                    token.id,
                    rewardAmount,
                ]
            }),
        )

        return {
            reserveA,
            reserveB,
            feeA,
            feeB,
            rewards,
            snapshotAt: _state.dynamic.snapshotAt,
        }
    }

    /**
     * Calculates tick score for dynamic field lookup.
     *
     * @param param - Parameters for calculating tick score
     * @param param.tick - Tick value
     * @returns Tick score
     */
    private tickScore({ tick }: { tick: BN }): BN {
        const tickBound = this.tickBound()
        const tickScore = tick.add(tickBound)
        
        // validate tick score is within bounds
        if (tickScore.lt(new BN(0)) || tickScore.gt(tickBound.mul(new BN(2)))) {
            throw new InvalidTickScoreException({
                tickScore: tickScore.toNumber(),
            })
        }
        
        return tickScore
    }

    /**
     * Returns the tick bound constant used for score calculation.
     *
     * @returns Tick bound value
     */
    private tickBound(): BN {
        return new BN(443636)
    }
}
