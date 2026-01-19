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
    ClmmFeesFormulaService 
} from "../../formulas"

@Injectable()
export class RaydiumFeesService implements IFeesService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly tickArrayService: TickArrayService,
        private readonly clmmFeesFormulaService: ClmmFeesFormulaService,
    ) {}

    async fees({ bot, state }: FeesParams): Promise<FeesResult> {
        const _state = state as ClmmLiquidityPoolState

        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }

        const positionId = bot.activePosition.associatedPosition.positionId
        const tickLower = bot.activePosition.associatedPosition?.tickLower ?? 0
        const tickUpper = bot.activePosition.associatedPosition?.tickUpper ?? 0

        const { programAddress } =
            state.static.metadata as RaydiumLiquidityPoolMetadata

        // ----------------------------
        // PDA derivation
        // ----------------------------
        const { pda: tickArrayLowerPda } =
            await this.tickArrayService.getPda({
                poolStateAddress: address(state.static.poolAddress),
                tickIndex: tickLower,
                tickSpacing: state.static.tickSpacing,
                programAddress: address(programAddress),
            })

        const { pda: tickArrayUpperPda } =
            await this.tickArrayService.getPda({
                poolStateAddress: address(state.static.poolAddress),
                tickIndex: tickUpper,
                tickSpacing: state.static.tickSpacing,
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
        const tickLowerIndex = new Decimal(tickLower)
            .sub(tickArrayLower.startTickIndex)
            .div(state.static.tickSpacing)

        const tickUpperIndex = new Decimal(tickUpper)
            .sub(tickArrayUpper.startTickIndex)
            .div(state.static.tickSpacing)

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
            feeGrowthGlobal: _state.dynamic.feeGrowthGlobalA,
            feeGrowthOutsideLower: new BN(tickLowerData.feeGrowthOutsideX64A.toString()),
            feeGrowthOutsideUpper: new BN(tickUpperData.feeGrowthOutsideX64A.toString()),
            tickCurrent: new Decimal(_state.dynamic.tickCurrent.toNumber()),
            tickLower: new Decimal(tickLower),
            tickUpper: new Decimal(tickUpper),
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

        return {
            feeA,
            feeB,
            rewards: [],
            snapshotAt: state.dynamic.snapshotAt,
        }
    }
}
