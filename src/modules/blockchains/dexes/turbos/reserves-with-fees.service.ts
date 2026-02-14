import {
    ReservesWithFeesParams,
    ReservesWithFeesResult,
    IReservesWithFeesService,
} from "../types"
import type {
    ClmmLiquidityPoolState,
} from "../../types"
import {
    Injectable,
} from "@nestjs/common"
import {
    RpcExecutorService,
    SuiObjectKind,
} from "../../clients"
import {
    ActivePositionNotFoundException,
    InvalidPoolTokensException,
    SuiObjectNotFoundException,
    SuiObjectInvalidTypeException,
    LiquidityPoolClmmStateNotFoundException,
    TokenNotFoundException,
} from "@modules/exceptions"
import BN from "bn.js"
import {
    Q64,
} from "@modules/common"
import {
    RpcAccessType,
} from "@modules/filesystem"
import Decimal from "decimal.js"
import {
    TurbosSuiObjectPositionFields,
    TurbosSuiObjectPositionNFTFields,
    TurbosSuiObjectTickFields,
    parseTurbosPosition,
    parseTurbosSuiObjectPositionNFT,
    parseTurbosTick,
} from "./struct"
import {
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
    DexId,
    TurbosLiquidityPoolMetadata,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    DynamicClmmRewardInfo,
} from "@modules/cache"

/**
 * Service responsible for calculating reserves and fees for Turbos CLMM positions.
 * Fetches on-chain data for position NFT, position, and tick info to compute current reserves,
 * accumulated fees, and rewards.
 *
 * @example
 * const service = new TurbosReservesWithFeesService(...)
 * const result = await service.reservesWithFees({ state, bot })
 */
@Injectable()
export class TurbosReservesWithFeesService implements IReservesWithFeesService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly clmmFeesFormulaService: ClmmFeesFormulaService,
        private readonly clmmRewardsFormulaService: ClmmRewardsFormulaService,
        private readonly clmmReservesFormulaService: ClmmReservesFormulaService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) { }

    /**
     * Computes the current reserves, accumulated fees, and rewards for a Turbos CLMM position.
     *
     * @param param - Parameters for calculating reserves with fees
     * @param param.state - The CLMM liquidity pool state
     * @param param.bot - The bot schema containing active position details
     * @returns The computed reserves, fees, and rewards
     * @throws {ActivePositionNotFoundException} If no active position is found for the bot
     * @throws {InvalidPoolTokensException} If token A or B metadata is not found
     * @throws {LiquidityPoolClmmStateNotFoundException} If CLMM state is missing for the active position
     * @throws {SuiObjectNotFoundException} If position NFT, position, or tick objects are not found on-chain
     * @throws {SuiObjectInvalidTypeException} If fetched objects are not of the expected Move object type
     * @throws {TokenNotFoundException} If a reward token's metadata is not found
     */
    async reservesWithFees({ 
        state,
        bot,
        liquidityPool,
    }: ReservesWithFeesParams): Promise<ReservesWithFeesResult> {
        const _state = state as ClmmLiquidityPoolState

        // Stage: state validation (requires an active position)
        if (!bot.activePosition || !bot.activePosition.position) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
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

        // Extract position details
        const positionId = bot.activePosition.associatedPosition?.positionId ?? ""

        // Stage: state validation (CLMM state must be present on the associated position)
        if (!bot.activePosition.associatedPosition?.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }

        const {
            tickLower: tickLowerStr,
            tickUpper: tickUpperStr
        } = bot.activePosition.associatedPosition.clmmState
        const tickLower = new BN(tickLowerStr)
        const tickUpper = new BN(tickUpperStr)
        const {
            i32Type
        } = liquidityPool.metadata as TurbosLiquidityPoolMetadata

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
                    parentId: liquidityPool.poolAddress,
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
                kind: SuiObjectKind.TickLower,
                parentId: liquidityPool.poolAddress,
                dexId: DexId.Turbos,
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        const _tickLowerData = tickLowerDataRaw as unknown as SuiMoveObjectData<
            SuiObject<TurbosSuiObjectTickFields, `${string}::tick::TickInfo`>,
            `${string}::tick::TickInfo`
        >
        const tickLowerData = parseTurbosTick(_tickLowerData.content.fields.value.fields)

        // Stage: on-chain fetch (tick upper dynamic field)
        const { data: tickUpperDataRaw } = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                return suiClient.getDynamicFieldObject({
                    parentId: liquidityPool.poolAddress,
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
                kind: SuiObjectKind.TickUpper,
                parentId: liquidityPool.poolAddress,
                dexId: DexId.Turbos,
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        const _tickUpperData = tickUpperDataRaw as unknown as SuiMoveObjectData<
            SuiObject<TurbosSuiObjectTickFields, `${string}::tick::TickInfo`>,
            `${string}::tick::TickInfo`
        >
        const tickUpperData = parseTurbosTick(_tickUpperData.content.fields.value.fields)

        // Stage: on-chain fetch (position NFT, then actual position)
        const nftPositionInfo = await this.rpcExecutorService.withSuiClient({
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
        // Stage: on-chain fetch validation (position NFT must exist)
        if (nftPositionInfo.error || !nftPositionInfo.data) {
            throw new SuiObjectNotFoundException({
                kind: SuiObjectKind.PositionNFT,
                id: positionId,
                dexId: DexId.Turbos,
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        if (nftPositionInfo.data.content?.dataType !== "moveObject") {
            throw new SuiObjectInvalidTypeException({
                kind: SuiObjectKind.PositionNFT,
                id: positionId,
                liquidityPoolId: liquidityPool.displayId,
                dexId: DexId.Turbos,
            })
        }
        const nftPositionFields = nftPositionInfo.data.content.fields as unknown as TurbosSuiObjectPositionNFTFields
        const nftPosition = parseTurbosSuiObjectPositionNFT(nftPositionFields)

        // Fetch actual position object using position ID from NFT
        const positionInfo = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                return suiClient.getObject({
                    id: nftPosition.positionId,
                    options: {
                        showContent: true,
                    },
                })
            },
        })
        // Stage: on-chain fetch validation (position must exist)
        if (positionInfo.error || !positionInfo.data) {
            throw new SuiObjectNotFoundException({
                kind: SuiObjectKind.Position,
                id: nftPosition.positionId,
                liquidityPoolId: liquidityPool.displayId,
                dexId: DexId.Turbos,
            })
        }
        if (positionInfo.data.content?.dataType !== "moveObject") {
            throw new SuiObjectInvalidTypeException({
                kind: SuiObjectKind.Position,
                id: nftPosition.positionId,
                liquidityPoolId: liquidityPool.displayId,
                dexId: DexId.Turbos,
            })
        }
        const positionFields = positionInfo.data.content.fields as unknown as TurbosSuiObjectPositionFields
        const position = parseTurbosPosition(positionFields)

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
            feeGrowthOutsideLowerA: new BN(tickLowerData.feeGrowthOutsideA.toString()),
            feeGrowthOutsideUpperA: new BN(tickUpperData.feeGrowthOutsideA.toString()),
            feeGrowthOutsideLowerB: new BN(tickLowerData.feeGrowthOutsideB.toString()),
            feeGrowthOutsideUpperB: new BN(tickUpperData.feeGrowthOutsideB.toString()),
            tickCurrent: _state.tickCurrent,
            tickLower,
            tickUpper,
            feeGrowthInsideLastA: position.feeGrowthInsideA,
            feeGrowthInsideLastB: position.feeGrowthInsideB,
            liquidity: position.liquidity,
            feeOwnedA: position.tokensOwedA,
            feeOwnedB: position.tokensOwedB,
            outsideDeltaWrapModulus: Q64,
            insideDeltaWrapModulus: Q64,
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
                } = _state.rewards[index]
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
                const rewardAmount = this.clmmRewardsFormulaService.computeRewardTurbos({
                    rewardGrowthGlobal: new BN(clmmReward.growthGlobal.toString()),
                    rewardGrowthOutsideLower: new BN(tickLowerData.rewardGrowthsOutside[index].toString()),
                    rewardGrowthOutsideUpper: new BN(tickUpperData.rewardGrowthsOutside[index].toString()),
                    tickCurrent: _state.tickCurrent,
                    tickLower,
                    tickUpper,
                    rewardGrowthInsideLast: position.rewardInfos[index].rewardGrowthInside,
                    liquidity: position.liquidity,
                    decimals: new Decimal(token.decimals),
                    rewardOwned: position.rewardInfos[index].coinsOwedReward,
                    emissionsPerSecond: new BN(clmmReward.emissionPerSecond.toString()),
                    lastUpdateMs: _state.rewardLastUpdatedTimeMs ?? new BN(0),
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
