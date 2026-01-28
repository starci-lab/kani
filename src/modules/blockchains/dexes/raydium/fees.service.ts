import {
    FeesParams, FeesResult, IFeesService 
} from "../../interfaces"
import {
    Injectable 
} from "@nestjs/common"
import {
    RpcExecutorService 
} from "../../clients"
import {
    RpcAccessType 
} from "@modules/filesystem"
import {
    address,
    fetchEncodedAccounts,
} from "@solana/kit"
import {
    ActivePositionNotFoundException,
    InvalidPoolTokensException,
    SolanaAccountNotFoundException,
    ErrorSolanaAccountName,
    MissingActivePositionLiquidityException,
    PositionClmmStateNotFoundException,
    LiquidityPoolClmmStateNotFoundException,
    TokenNotFoundException,
} from "@modules/exceptions"
import {
    TickArrayLayout 
} from "@raydium-io/raydium-sdk-v2"
import BN from "bn.js"
import {
    ClmmLiquidityPoolState 
} from "../../interfaces"
import {
    RaydiumLiquidityPoolMetadata,
    PrimaryMemoryStorageService,
    DexId,
} from "@modules/databases"
import {
    Q128, Q64 
} from "@modules/utils"
import {
    TickArrayService 
} from "./transactions"
import {
    Decimal 
} from "decimal.js"
import {
    PersonalPositionState 
} from "./beets"
import {
    ClmmFeesFormulaService,
    ClmmRewardsFormulaService,
} from "../../formulas"
import {
    DynamicClmmRewardInfo,
} from "@modules/cache"

@Injectable()
export class RaydiumFeesService implements IFeesService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly tickArrayService: TickArrayService,
        private readonly clmmFeesFormulaService: ClmmFeesFormulaService,
        private readonly clmmRewardsFormulaService: ClmmRewardsFormulaService,
    ) {}

    async fees({ bot, state }: FeesParams): Promise<FeesResult> {
        const _state = state as ClmmLiquidityPoolState
        // Stage: state validation (pool must have CLMM static state)
        if (!_state.static.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException({
                liquidityPoolId: _state.static.displayId,
            })
        }
        // Stage: state validation (fees require an active position)
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }

        const positionId = bot.activePosition.associatedPosition.positionId
        // Stage: state validation (position must have CLMM state recorded)
        if (!bot.activePosition.associatedPosition.clmmState) {
            throw new PositionClmmStateNotFoundException({
                positionId: bot.activePosition.associatedPosition.positionId,
                botId: bot.id,
            })
        }
        const tickLower = new BN(bot.activePosition.associatedPosition.clmmState.tickLower)
        const tickUpper = new BN(bot.activePosition.associatedPosition.clmmState.tickUpper)

        const { programAddress } =
            _state.static.metadata as RaydiumLiquidityPoolMetadata

        // ----------------------------
        // PDA derivation
        // ----------------------------
        const { pda: tickArrayLowerPda } =
            await this.tickArrayService.getPda({
                poolStateAddress: address(_state.static.poolAddress),
                tickIndex: tickLower,
                tickSpacing: new BN(_state.static.clmmState.tickSpacing),
                programAddress: address(programAddress),
            }
            )

        const { pda: tickArrayUpperPda } =
            await this.tickArrayService.getPda({
                poolStateAddress: address(_state.static.poolAddress),
                tickIndex: tickUpper,
                tickSpacing: new BN(_state.static.clmmState.tickSpacing),
                programAddress: address(programAddress),
            }
            )

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
                name: ErrorSolanaAccountName.PersonalPosition,
                address: positionId,
                dexId: DexId.Raydium,
                liquidityPoolId: _state.static.displayId,
            })
        }

        if (!tickArrayLowerAccount?.exists) {
            throw new SolanaAccountNotFoundException({
                name: ErrorSolanaAccountName.TickArrayLower,
                address: tickArrayLowerPda,
                dexId: DexId.Raydium,
                liquidityPoolId: _state.static.displayId,
            })
        }

        if (!tickArrayUpperAccount?.exists) {
            throw new SolanaAccountNotFoundException({
                name: ErrorSolanaAccountName.TickArrayUpper,
                address: tickArrayUpperPda,
                dexId: DexId.Raydium,
                liquidityPoolId: _state.static.displayId,
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
        // Tick index resolution
        // ----------------------------
        const tickLowerIndex = new Decimal(tickLower.toString())
            .sub(new Decimal(tickArrayLower.startTickIndex.toString()))
            .div(new Decimal(_state.static.clmmState.tickSpacing.toString()))

        const tickUpperIndex = new Decimal(tickUpper.toString())
            .sub(new Decimal(tickArrayUpper.startTickIndex.toString()))
            .div(new Decimal(_state.static.clmmState.tickSpacing.toString()))

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

        const { feeA, feeB } = this.clmmFeesFormulaService.computeFees({
            feeGrowthGlobalA: _state.dynamic.feeGrowthGlobalA,
            feeGrowthGlobalB: _state.dynamic.feeGrowthGlobalB,
            feeGrowthOutsideLowerA: new BN(tickLowerData.feeGrowthOutsideX64A.toString()),
            feeGrowthOutsideUpperA: new BN(tickUpperData.feeGrowthOutsideX64A.toString()),
            feeGrowthOutsideLowerB: new BN(tickLowerData.feeGrowthOutsideX64B.toString()),
            feeGrowthOutsideUpperB: new BN(tickUpperData.feeGrowthOutsideX64B.toString()),
            tickCurrent: _state.dynamic.tickCurrent,
            tickLower: new BN(tickLower),
            tickUpper: new BN(tickUpper),
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
        const clmmRewards = _state.dynamic.rewards as Array<DynamicClmmRewardInfo>
        const rewards = Object.fromEntries(
            clmmRewards.map((clmmReward, index) => {
                const tokenAddress = clmmReward.tokenAddress
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
                const lastUpdateMs = clmmReward.lastUpdateTimeMs ?? _state.dynamic.rewardLastUpdatedTimeMs ?? new BN(0)
                const rewardAmount = this.clmmRewardsFormulaService.computeReward({
                    rewardGrowthGlobal: new BN(clmmReward.growthGlobal.toString()),
                    rewardGrowthOutsideLower: new BN(tickLowerData.rewardGrowthsOutsideX64[index].toString()),
                    rewardGrowthOutsideUpper: new BN(tickUpperData.rewardGrowthsOutsideX64[index].toString()),
                    tickCurrent: _state.dynamic.tickCurrent,
                    tickLower: new BN(tickLower),
                    tickUpper: new BN(tickUpper),
                    rewardGrowthInsideLast: new BN(posReward.growthInsideLastX64.toString()),
                    liquidity,
                    decimals: new Decimal(token.decimals),
                    rewardOwned: new BN(posReward.rewardAmountOwed.toString()),
                    emissionsPerSecond: new BN(clmmReward.emissionPerSecond.toString()),
                    lastUpdateMs,
                    totalLiquidity: new BN(_state.dynamic.liquidity.toString()),
                })
                return [
                    token.id,
                    rewardAmount,
                ]
            }),
        )

        return {
            feeA,
            feeB,
            rewards,
            snapshotAt: _state.dynamic.snapshotAt,
        }
    }
}
