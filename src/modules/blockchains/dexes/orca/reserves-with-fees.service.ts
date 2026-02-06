import {
    ReservesWithFeesParams,
    ReservesWithFeesResult,
    IReservesWithFeesService,
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
    ErrorSolanaAccountName,
    SolanaAccountNotFoundException,
    LiquidityPoolClmmStateNotFoundException,
    PositionClmmStateNotFoundException,
    TokenNotFoundException,
} from "@modules/exceptions"
import {
    Position,
} from "./beets"
import {
    decodeTickArray,
} from "@orca-so/whirlpools-client"
import BN from "bn.js"
import {
    Q128,
    Q64,
} from "@modules/utils"
import {
    DexId,
    OrcaLiquidityPoolMetadata,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    TickArrayService,
} from "./transactions"
import {
    Decimal,
} from "decimal.js"
import {
    ClmmFeesFormulaService,
    ClmmRewardsFormulaService,
    ClmmReservesFormulaService,
} from "../../formulas"
import {
    DynamicClmmRewardInfo,
} from "@modules/cache"

/**
 * Service responsible for calculating reserves and fees for Orca CLMM positions.
 * Fetches on-chain data for position and tick arrays to compute current reserves,
 * accumulated fees, and rewards.
 *
 * @example
 * const service = new OrcaReservesWithFeesService(...)
 * const result = await service.reservesWithFees({ state, bot })
 */
@Injectable()
export class OrcaReservesWithFeesService implements IReservesWithFeesService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly tickArrayService: TickArrayService,
        private readonly clmmFeesFormulaService: ClmmFeesFormulaService,
        private readonly clmmRewardsFormulaService: ClmmRewardsFormulaService,
        private readonly clmmReservesFormulaService: ClmmReservesFormulaService,
    ) {}

    /**
     * Computes the current reserves, accumulated fees, and rewards for an Orca CLMM position.
     *
     * @param param - Parameters for calculating reserves with fees
     * @param param.state - The CLMM liquidity pool state
     * @param param.bot - The bot schema containing active position details
     * @returns The computed reserves, fees, and rewards
     * @throws {LiquidityPoolClmmStateNotFoundException} If CLMM state is missing for the pool
     * @throws {ActivePositionNotFoundException} If no active position is found for the bot
     * @throws {PositionClmmStateNotFoundException} If CLMM state is missing for the active position
     * @throws {InvalidPoolTokensException} If token A or B metadata is not found
     * @throws {SolanaAccountNotFoundException} If position or tick array accounts are not found on-chain
     * @throws {TokenNotFoundException} If a reward token's metadata is not found
     */
    async reservesWithFees({ bot, state }: ReservesWithFeesParams): Promise<ReservesWithFeesResult> {
        const _state = state as ClmmLiquidityPoolState

        // Stage: state validation (pool must have CLMM static state)
        if (!_state.static.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException({
                liquidityPoolId: _state.static.displayId,
            })
        }
        // Stage: state validation (requires an active position)
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }

        // Extract position details
        const {
            positionId,
            clmmState: {
                tickLower: tickLowerStr,
                tickUpper: tickUpperStr,
                liquidity: liquidityStr
            }
        } = bot.activePosition.associatedPosition
        const tickLower = new BN(tickLowerStr)
        const tickUpper = new BN(tickUpperStr)

        // Stage: state validation (position must have CLMM state recorded)
        if (!bot.activePosition.associatedPosition.clmmState) {
            throw new PositionClmmStateNotFoundException({
                positionId,
                botId: bot.id,
            })
        }

        const {
            programAddress
        } = _state.static.metadata as OrcaLiquidityPoolMetadata

        // ----------------------------
        // Token validation
        // ----------------------------
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

        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: _state.static.displayId,
            })
        }

        // ----------------------------
        // PDA derivation
        // ----------------------------
        const { pda: tickArrayLowerPda } =
            await this.tickArrayService.getPda({
                poolStateAddress: address(_state.static.poolAddress),
                tickIndex: tickLower,
                tickSpacing: new BN(_state.static.clmmState.tickSpacing),
                bot,
                pdaOnly: true,
                programAddress: address(programAddress),
            })

        const { pda: tickArrayUpperPda } =
            await this.tickArrayService.getPda({
                poolStateAddress: address(_state.static.poolAddress),
                tickIndex: tickUpper,
                tickSpacing: new BN(_state.static.clmmState.tickSpacing),
                bot,
                pdaOnly: true,
                programAddress: address(programAddress),
            })

        // ----------------------------
        // BATCH FETCH: position + 2 tick arrays
        // ----------------------------
        const [
            positionAccount,
            tickArrayLowerAccount,
            tickArrayUpperAccount,
        ] = await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Http,
            callback: async ({ rpc }) => {
                return fetchEncodedAccounts(rpc,
                    [
                        address(positionId),
                        tickArrayLowerPda,
                        tickArrayUpperPda,
                    ])
            },
        })

        // ----------------------------
        // Validate accounts
        // ----------------------------
        if (!positionAccount || !positionAccount.exists) {
            throw new SolanaAccountNotFoundException({
                name: ErrorSolanaAccountName.PersonalPosition,
                address: positionId,
                dexId: DexId.Orca,
                liquidityPoolId: _state.static.displayId,
            })
        }

        // ----------------------------
        // Decode accounts
        // ----------------------------
        // Deserialize position state (skip 8-byte discriminator)
        const [positionState] = Position.struct.deserialize(
            Buffer.from(positionAccount.data),
            8,
        )

        // Decode tick arrays
        const tickArrayLower = decodeTickArray(tickArrayLowerAccount)
        if (!tickArrayLower.exists) {
            throw new SolanaAccountNotFoundException({
                name: ErrorSolanaAccountName.TickArrayLower,
                address: tickArrayLower.address,
                dexId: DexId.Orca,
                liquidityPoolId: _state.static.displayId,
            })
        }
        const tickArrayUpper = decodeTickArray(tickArrayUpperAccount)
        if (!tickArrayUpper.exists) {
            throw new SolanaAccountNotFoundException({
                name: ErrorSolanaAccountName.TickArrayUpper,
                address: tickArrayUpper.address,
                dexId: DexId.Orca,
                liquidityPoolId: _state.static.displayId,
            })
        }

        // ----------------------------
        // Tick index resolution
        // ----------------------------
        const lowerStart = new BN(tickArrayLower.data.startTickIndex)
        const upperStart = new BN(tickArrayUpper.data.startTickIndex)

        // Calculate tick indices within their respective tick arrays
        const tickLowerIndex = tickLower
            .sub(lowerStart)
            .div(new BN(_state.static.clmmState.tickSpacing))

        const tickUpperIndex = tickUpper
            .sub(upperStart)
            .div(new BN(_state.static.clmmState.tickSpacing))

        // Get tick data from arrays
        const tickLowerData = tickArrayLower.data.ticks[tickLowerIndex.toNumber()]
        const tickUpperData = tickArrayUpper.data.ticks[tickUpperIndex.toNumber()]

        const liquidity = new BN(liquidityStr)

        // ----------------------------
        // Reserves calculation
        // ----------------------------
        const {
            reserveA,
            reserveB,
        } = this.clmmReservesFormulaService.computeReserves({
            tickLower,
            tickUpper,
            tickCurrent: _state.dynamic.tickCurrent,
            liquidity,
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
            feeGrowthGlobalA: _state.dynamic.feeGrowthGlobalA,
            feeGrowthGlobalB: _state.dynamic.feeGrowthGlobalB,
            feeGrowthOutsideLowerA: new BN(tickLowerData.feeGrowthOutsideA.toString()),
            feeGrowthOutsideUpperA: new BN(tickUpperData.feeGrowthOutsideA.toString()),
            feeGrowthOutsideLowerB: new BN(tickLowerData.feeGrowthOutsideB.toString()),
            feeGrowthOutsideUpperB: new BN(tickUpperData.feeGrowthOutsideB.toString()),
            tickCurrent: _state.dynamic.tickCurrent,
            tickLower,
            tickUpper,
            feeGrowthInsideLastA: new BN(positionState.feeGrowthCheckpointA.toString()),
            feeGrowthInsideLastB: new BN(positionState.feeGrowthCheckpointB.toString()),
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
        const clmmRewards = _state.dynamic.rewards as Array<DynamicClmmRewardInfo>
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
                const posReward = positionState.rewardInfos[index]
                const rewardAmount = this.clmmRewardsFormulaService.computeReward({
                    rewardGrowthGlobal: new BN(clmmReward.growthGlobal.toString()),
                    rewardGrowthOutsideLower: new BN(tickLowerData.rewardGrowthsOutside[index].toString()),
                    rewardGrowthOutsideUpper: new BN(tickUpperData.rewardGrowthsOutside[index].toString()),
                    tickCurrent: _state.dynamic.tickCurrent,
                    tickLower,
                    tickUpper,
                    rewardGrowthInsideLast: new BN(posReward.growthInsideCheckpoint.toString()),
                    liquidity,
                    decimals: new Decimal(token.decimals),
                    rewardOwned: new BN(posReward.amountOwed.toString()),
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
}
