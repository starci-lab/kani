import {
    ReservesWithFeesParams,
    ReservesWithFeesResult,
    IReservesWithFeesService,
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
    ErrorSuiObjectKind,
    SuiObjectInvalidTypeException,
    LiquidityPoolClmmStateNotFoundException,
    TokenNotFoundException,
} from "@modules/exceptions"
import BN from "bn.js"
import {
    Q128,
    Q64,
} from "@modules/common"
import {
    RpcAccessType,
} from "@modules/filesystem"
import Decimal from "decimal.js"
import {
    FlowXSuiObjectPositionFields,
    FlowXSuiObjectTickInfoFields,
    parseFlowXPosition,
    parseFlowXTickInfo,
} from "./struct"
import {
    ClmmLiquidityPoolState,
    SuiMoveObjectData,
    SuiObject,  
} from "../../types"
import {
    serializeSuiI32,
} from "../../utils"
import {
    ClmmFeesFormulaService,
    ClmmRewardsFormulaService,
    ClmmReservesFormulaService,
} from "../../formulas"
import {
    DynamicClmmRewardInfo,
} from "@modules/cache"
import {
    DexId,
    FlowXLiquidityPoolMetadata,
    PrimaryMemoryStorageService,
} from "@modules/databases"

/**
 * Service responsible for calculating reserves and fees for FlowX CLMM positions.
 * Fetches on-chain data for ticks and position info to compute current reserves,
 * accumulated fees, and rewards.
 *
 * @example
 * const service = new FlowXReservesWithFeesService(...)
 * const result = await service.reservesWithFees({ state, bot })
 */
@Injectable()
export class FlowXReservesWithFeesService implements IReservesWithFeesService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly clmmFeesFormulaService: ClmmFeesFormulaService,
        private readonly clmmRewardsFormulaService: ClmmRewardsFormulaService,
        private readonly clmmReservesFormulaService: ClmmReservesFormulaService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) { }

    /**
     * Computes the current reserves, accumulated fees, and rewards for a FlowX CLMM position.
     *
     * @param param - Parameters for calculating reserves with fees
     * @param param.state - The CLMM liquidity pool state
     * @param param.bot - The bot schema containing active position details
     * @param param.liquidityPool - The liquidity pool
     * @returns The computed reserves, fees, and rewards
     * @throws {ActivePositionNotFoundException} If no active position is found for the bot
     * @throws {LiquidityPoolClmmStateNotFoundException} If CLMM state is missing for the active position
     * @throws {InvalidPoolTokensException} If token A or B metadata is not found
     * @throws {SuiObjectNotFoundException} If tick lower, tick upper, or position objects are not found on-chain
     * @throws {SuiObjectInvalidTypeException} If fetched objects are not of the expected Move object type
     * @throws {TokenNotFoundException} If a reward token's metadata is not found
     */
    async reservesWithFees({ state, bot, liquidityPool }: ReservesWithFeesParams): Promise<ReservesWithFeesResult> {
        const _state = state as ClmmLiquidityPoolState
        // Stage: state validation (requires an active position)
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        // Stage: state validation (position must have CLMM state recorded)
        if (!bot.activePosition.associatedPosition?.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }

        // Stage: state validation (pool token metadata must exist)
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: liquidityPool.tokenA.toString(),
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: liquidityPool.tokenB.toString(),
        })
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }

        // Extract position details and metadata
        const positionId = bot.activePosition.associatedPosition?.positionId ?? ""
        const tickLower = new BN(bot.activePosition.associatedPosition.clmmState.tickLower)
        const tickUpper = new BN(bot.activePosition.associatedPosition.clmmState.tickUpper)
        const {
            i32Type,
            ticksId
        } = liquidityPool.metadata as FlowXLiquidityPoolMetadata

        // Serialize tick indices for dynamic field names
        const tickLowerName = serializeSuiI32(new BN(tickLower.toString()),
            i32Type)
        const tickUpperName = serializeSuiI32(new BN(tickUpper.toString()),
            i32Type)

        // Stage: on-chain fetch (tick lower dynamic field)
        const { data: tickLowerDataRaw } = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                return suiClient.getDynamicFieldObject({
                    parentId: ticksId,
                    name: {
                        type: tickLowerName.type,
                        value: tickLowerName.fields,
                    },
                })
            },
        })
        // Stage: on-chain fetch validation
        if (!tickLowerDataRaw) {
            throw new SuiObjectNotFoundException({
                kind: ErrorSuiObjectKind.TickLower,
                parentId: ticksId,
                dexId: DexId.FlowX,
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        const _tickLowerData = tickLowerDataRaw as unknown as SuiMoveObjectData<
            SuiObject<FlowXSuiObjectTickInfoFields, `${string}::tick::TickInfo`>,
            `${string}::tick::TickInfo`
        >
        const tickLowerData = parseFlowXTickInfo(_tickLowerData.content.fields.value.fields)

        // Stage: on-chain fetch (tick upper dynamic field)
        const { data: tickUpperDataRaw } = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                return suiClient.getDynamicFieldObject({
                    parentId: ticksId,
                    name: {
                        type: tickUpperName.type,
                        value: tickUpperName.fields,
                    },
                })
            },
        })
        // Stage: on-chain fetch validation
        if (!tickUpperDataRaw) {
            throw new SuiObjectNotFoundException({
                kind: ErrorSuiObjectKind.TickUpper,
                parentId: ticksId,
                dexId: DexId.FlowX,
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        const _tickUpperData = tickUpperDataRaw as unknown as SuiMoveObjectData<
            SuiObject<FlowXSuiObjectTickInfoFields, `${string}::tick::TickInfo`>,
            `${string}::tick::TickInfo`
        >
        const tickUpperData = parseFlowXTickInfo(_tickUpperData.content.fields.value.fields)

        // Stage: on-chain fetch (position)
        const objectInfo = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                return suiClient.getObject({
                    id: positionId,
                    options: {
                        showContent: true,
                    },
                })
            },
        })
        // Stage: on-chain fetch validation
        if (objectInfo.error || !objectInfo.data) {
            throw new SuiObjectNotFoundException({
                kind: ErrorSuiObjectKind.Position,
                id: positionId,
                dexId: DexId.FlowX,
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        if (objectInfo.data.content?.dataType !== "moveObject") {
            throw new SuiObjectInvalidTypeException({
                kind: ErrorSuiObjectKind.Position,
                id: positionId,
                liquidityPoolId: liquidityPool.displayId,
                dexId: DexId.FlowX,
            })
        }
        const fields = objectInfo.data.content.fields as unknown as FlowXSuiObjectPositionFields
        const position = parseFlowXPosition(fields)

        // ----------------------------
        // Reserves calculation
        // ----------------------------
        const {
            reserveA,
            reserveB,
        } = this.clmmReservesFormulaService.computeReserves({
            tickLower,
            tickUpper,
            tickCurrent: _state.tickCurrent,
            liquidity: position.liquidity,
            decimalsA: new Decimal(tokenA.decimals),
            decimalsB: new Decimal(tokenB.decimals),
            fixedPointScale: Q64,
        })

        // ----------------------------
        // Fee calculation
        // ----------------------------
        const {
            feeA,
            feeB
        } = this.clmmFeesFormulaService.computeFees({
            feeGrowthGlobalA: _state.feeGrowthGlobalA,
            feeGrowthGlobalB: _state.feeGrowthGlobalB,
            feeGrowthOutsideLowerA: new BN(tickLowerData.feeGrowthOutsideX.toString()),
            feeGrowthOutsideUpperA: new BN(tickUpperData.feeGrowthOutsideX.toString()),
            feeGrowthOutsideLowerB: new BN(tickLowerData.feeGrowthOutsideY.toString()),
            feeGrowthOutsideUpperB: new BN(tickUpperData.feeGrowthOutsideY.toString()),
            tickCurrent: _state.tickCurrent,
            tickLower,
            tickUpper,
            feeGrowthInsideLastA: position.feeGrowthInsideXLast,
            feeGrowthInsideLastB: position.feeGrowthInsideYLast,
            liquidity: position.liquidity,
            feeOwnedA: position.coinsOwedX,
            feeOwnedB: position.coinsOwedY,
            outsideDeltaWrapModulus: Q128,
            insideDeltaWrapModulus: Q128,
            resultDiv: Q64,
            decimalsA: new Decimal(tokenA.decimals),
            decimalsB: new Decimal(tokenB.decimals),
        })

        // ----------------------------
        // Rewards (CLMM time-based)
        // ----------------------------
        const clmmRewards = _state.rewards as Array<DynamicClmmRewardInfo>
        const rewards = Object.fromEntries(
            clmmRewards.map((clmmReward, index) => {
                const {
                    tokenAddress
                } = clmmReward
                const token = this.primaryMemoryStorageService.tokenCollection.findOne({
                    tokenAddress: {
                        $eq: tokenAddress,
                    },
                })
                if (!token) {
                    throw new TokenNotFoundException({
                        tokenAddress,
                    })
                }
                const posReward = position.rewardInfos[index]
                const lastUpdateMs = clmmReward.lastUpdateTimeMs ?? _state.rewardLastUpdatedTimeMs ?? new BN(0)
                const rewardAmount = this.clmmRewardsFormulaService.computeReward({
                    rewardGrowthGlobal: new BN(clmmReward.growthGlobal.toString()),
                    rewardGrowthOutsideLower: new BN(tickLowerData.rewardGrowthsOutside[index].toString()),
                    rewardGrowthOutsideUpper: new BN(tickUpperData.rewardGrowthsOutside[index].toString()),
                    tickCurrent: _state.tickCurrent,
                    tickLower,
                    tickUpper,
                    rewardGrowthInsideLast: posReward.rewardGrowthInsideLast,
                    liquidity: position.liquidity,
                    decimals: new Decimal(token.decimals),
                    rewardOwned: posReward.coinsOwedReward,
                    emissionsPerSecond: new BN(clmmReward.emissionPerSecond.toString()),
                    lastUpdateMs,
                    totalLiquidity: new BN(_state.liquidity.toString()),
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
            snapshotAt: _state.snapshotAt,
        }
    }
}
