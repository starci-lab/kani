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
} from "../../clients"
import {
    RpcAccessType,
} from "@modules/filesystem"
import {
    address,
    fetchEncodedAccounts,
} from "@solana/kit"
import {
    ActivePositionNotFoundException,
    InvalidPoolTokensException,
    SolanaAccountNotFoundException,
    ErrorSolanaAccountKind,
    MissingActivePositionLiquidityException,
    LiquidityPoolClmmStateNotFoundException,
    TokenNotFoundException,
} from "@modules/exceptions"
import {
    TickArrayLayout,
} from "@raydium-io/raydium-sdk-v2"
import BN from "bn.js"
import {
    RaydiumLiquidityPoolMetadata,
    PrimaryMemoryStorageService,
    DexId,
} from "@modules/databases"
import {
    Q128,
    Q64,
} from "@modules/common"
import {
    TickArrayService,
} from "./transactions"
import {
    Decimal,
} from "decimal.js"
import {
    PersonalPositionState,
} from "./beets"
import {
    ClmmFeesFormulaService,
    ClmmRewardsFormulaService,
    ClmmReservesFormulaService,
} from "../../formulas"
import {
    DynamicClmmRewardInfo,
} from "@modules/cache"

/**
 * Service responsible for calculating reserves and fees for Raydium CLMM positions.
 * Fetches on-chain data for position and tick arrays to compute current reserves,
 * accumulated fees, and rewards.
 *
 * @example
 * const service = new RaydiumReservesWithFeesService(...)
 * const result = await service.reservesWithFees({ state, bot })
 */
@Injectable()
export class RaydiumReservesWithFeesService implements IReservesWithFeesService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly tickArrayService: TickArrayService,
        private readonly clmmFeesFormulaService: ClmmFeesFormulaService,
        private readonly clmmRewardsFormulaService: ClmmRewardsFormulaService,
        private readonly clmmReservesFormulaService: ClmmReservesFormulaService,
    ) {}

    /**
     * Computes the current reserves, accumulated fees, and rewards for a Raydium CLMM position.
     *
     * @param param - Parameters for calculating reserves with fees
     * @param param.state - The CLMM liquidity pool state
     * @param param.bot - The bot schema containing active position details
     * @param param.liquidityPool - The liquidity pool schema
     * @returns The computed reserves, fees, and rewards
     * @throws {LiquidityPoolClmmStateNotFoundException} If CLMM state is missing for the pool
     * @throws {ActivePositionNotFoundException} If no active position is found for the bot
     * @throws {PositionClmmStateNotFoundException} If CLMM state is missing for the active position
     * @throws {InvalidPoolTokensException} If token A or B metadata is not found
     * @throws {SolanaAccountNotFoundException} If position or tick array accounts are not found on-chain
     * @throws {MissingActivePositionLiquidityException} If position has no liquidity
     * @throws {TokenNotFoundException} If a reward token's metadata is not found
     */
    async reservesWithFees({ bot, state, liquidityPool }: ReservesWithFeesParams): Promise<ReservesWithFeesResult> {
        const _state = state as ClmmLiquidityPoolState
        // Stage: state validation (pool must have CLMM static state)
        if (!liquidityPool.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        // Stage: state validation (requires an active position)
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }

        if (!bot.activePosition.associatedPosition?.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        // Stage: state validation (position must have CLMM state recorded)
        const {
            positionId,
            clmmState: {
                tickLower: tickLowerNumber,
                tickUpper: tickUpperNumber,
            }
        } = bot.activePosition.associatedPosition
        const tickLower = new BN(tickLowerNumber)
        const tickUpper = new BN(tickUpperNumber)

        const {
            programAddress
        } = liquidityPool.metadata as RaydiumLiquidityPoolMetadata

        // ----------------------------
        // Token validation
        // ----------------------------
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: liquidityPool.tokenA.toString(),
            },
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: liquidityPool.tokenB.toString(),
            },
        })

        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }

        // ----------------------------
        // PDA derivation
        // ----------------------------
        const { pda: tickArrayLowerPda } =
            await this.tickArrayService.getPda({
                poolStateAddress: address(liquidityPool.poolAddress),
                tickIndex: tickLower,
                tickSpacing: new BN(liquidityPool.clmmState.tickSpacing),
                programAddress: address(programAddress),
            })

        const { pda: tickArrayUpperPda } =
            await this.tickArrayService.getPda({
                poolStateAddress: address(liquidityPool.poolAddress),
                tickIndex: tickUpper,
                tickSpacing: new BN(liquidityPool.clmmState?.tickSpacing ?? 0),
                programAddress: address(programAddress),
            })

        // ----------------------------
        // Batch fetch accounts
        // ----------------------------
        const [
            positionAccount,
            tickArrayLowerAccount,
            tickArrayUpperAccount,
        ] = await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Http,
            callback: async ({ rpc }) =>
                fetchEncodedAccounts(rpc,
                    [
                        address(positionId),
                        tickArrayLowerPda,
                        tickArrayUpperPda,
                    ]),
        })

        if (!positionAccount?.exists) {
            throw new SolanaAccountNotFoundException({
                kind: ErrorSolanaAccountKind.PersonalPosition,
                address: positionId,
                dexId: DexId.Raydium,
                liquidityPoolId: liquidityPool.displayId,
            })
        }

        if (!tickArrayLowerAccount?.exists) {
            throw new SolanaAccountNotFoundException({
                kind: ErrorSolanaAccountKind.TickArrayLower,
                address: tickArrayLowerPda,
                dexId: DexId.Raydium,
                liquidityPoolId: liquidityPool.displayId,
            })
        }

        if (!tickArrayUpperAccount?.exists) {
            throw new SolanaAccountNotFoundException({
                kind: ErrorSolanaAccountKind.TickArrayUpper,
                address: tickArrayUpperPda,
                dexId: DexId.Raydium,
                liquidityPoolId: liquidityPool.displayId,
            })
        }

        // ----------------------------
        // Decode accounts
        // ----------------------------
        const [positionState] = PersonalPositionState.struct.deserialize(
            Buffer.from(positionAccount.data),
            8,
        )

        const tickArrayLower = TickArrayLayout.decode(
            Buffer.from(tickArrayLowerAccount.data),
        )
        const tickArrayUpper = TickArrayLayout.decode(
            Buffer.from(tickArrayUpperAccount.data),
        )

        // ----------------------------
        // Tick index resolution
        // ----------------------------
        const tickLowerIndex = new Decimal(tickLower.toString())
            .sub(new Decimal(tickArrayLower.startTickIndex.toString()))
            .div(new Decimal(liquidityPool.clmmState?.tickSpacing ?? 0))

        const tickUpperIndex = new Decimal(tickUpper.toString())
            .sub(new Decimal(tickArrayUpper.startTickIndex.toString()))
            .div(new Decimal(liquidityPool.clmmState?.tickSpacing ?? 0))

        if (
            tickLowerIndex.lessThan(0) ||
            tickLowerIndex.greaterThanOrEqualTo(
                tickArrayLower.ticks.length,
            )
        ) {
            throw new Error("Lower tick index out of range")
        }

        if (
            tickUpperIndex.lessThan(0) ||
            tickUpperIndex.greaterThanOrEqualTo(
                tickArrayUpper.ticks.length,
            )
        ) {
            throw new Error("Upper tick index out of range")
        }

        const tickLowerData =
            tickArrayLower.ticks[tickLowerIndex.toNumber()]
        const tickUpperData =
            tickArrayUpper.ticks[tickUpperIndex.toNumber()]

        if (!positionState.liquidity) {
            throw new MissingActivePositionLiquidityException({
                botId: bot.id,
            })
        }

        const liquidity = new BN(positionState.liquidity.toString())

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
            liquidity,
            decimalsA: new Decimal(tokenA.decimals),
            decimalsB: new Decimal(tokenB.decimals),
            fixedPointScale: Q64,
        })

        // ----------------------------
        // Fee calculation
        // ----------------------------
        const { feeA, feeB } = this.clmmFeesFormulaService.computeFees({
            feeGrowthGlobalA: _state.feeGrowthGlobalA,
            feeGrowthGlobalB: _state.feeGrowthGlobalB,
            feeGrowthOutsideLowerA: new BN(tickLowerData.feeGrowthOutsideX64A.toString()),
            feeGrowthOutsideUpperA: new BN(tickUpperData.feeGrowthOutsideX64A.toString()),
            feeGrowthOutsideLowerB: new BN(tickLowerData.feeGrowthOutsideX64B.toString()),
            feeGrowthOutsideUpperB: new BN(tickUpperData.feeGrowthOutsideX64B.toString()),
            tickCurrent: _state.tickCurrent,
            tickLower,
            tickUpper,
            feeGrowthInsideLastA: new BN(positionState.feeGrowthInside0LastX64.toString()),
            feeGrowthInsideLastB: new BN(positionState.feeGrowthInside1LastX64.toString()),
            liquidity,
            feeOwnedA: new BN(0),
            feeOwnedB: new BN(0),
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
                const tokenAddress = clmmReward.tokenAddress
                const token = this.primaryMemoryStorageService.getTokenByAddress(tokenAddress)
                if (!token) {
                    throw new TokenNotFoundException({
                        tokenAddress,
                    })
                }
                const posReward = positionState.rewardInfos[index]
                const lastUpdateMs = clmmReward.lastUpdateTimeMs ?? _state.rewardLastUpdatedTimeMs ?? new BN(0)
                console.log({
                    rewardGrowthGlobal: new BN(clmmReward.growthGlobal.toString()).toString(),
                    rewardGrowthOutsideLower: new BN(tickLowerData.rewardGrowthsOutsideX64[index].toString()).toString(),
                    rewardGrowthOutsideUpper: new BN(tickUpperData.rewardGrowthsOutsideX64[index].toString()).toString(),
                    tickCurrent: _state.tickCurrent.toString(),
                    tickLower: tickLower.toString(),
                    tickUpper: tickUpper.toString(),
                    rewardGrowthInsideLast: new BN(posReward.growthInsideLastX64.toString()).toString(),
                    liquidity: liquidity.toString(),
                    decimals: new Decimal(token.decimals).toString(),
                    rewardOwned: new BN(posReward.rewardAmountOwed.toString()).toString(),
                    emissionsPerSecond: new BN(clmmReward.emissionPerSecond.toString()).toString(),
                    lastUpdateMs: lastUpdateMs.toString(),
                    totalLiquidity: new BN(_state.liquidity.toString()).toString(),
                })
                console.log(tickLowerData)
                console.log(tickUpperData)
                const rewardAmount = this.clmmRewardsFormulaService.computeRewardRaydium({
                    rewardGrowthGlobal: new BN(clmmReward.growthGlobal.toString()),
                    rewardGrowthOutsideLower: new BN(tickLowerData.rewardGrowthsOutsideX64[index].toString()),
                    rewardGrowthOutsideUpper: new BN(tickUpperData.rewardGrowthsOutsideX64[index].toString()),
                    tickCurrent: _state.tickCurrent,
                    tickLower,
                    tickUpper,
                    rewardGrowthInsideLast: new BN(posReward.growthInsideLastX64.toString()),
                    liquidity,
                    decimals: new Decimal(token.decimals),
                    rewardOwned: new BN(posReward.rewardAmountOwed.toString()),
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
