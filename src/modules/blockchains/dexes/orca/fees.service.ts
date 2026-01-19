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
    MissingActivePositionLiquidityException,
    ActivePositionNotFoundException,
    InvalidPoolTokensException,
    ErrorSolanaAccountName,
    SolanaAccountNotFoundException,
} from "@modules/exceptions"
import {
    Position 
} from "./beets"
import {
    decodeTickArray 
} from "@orca-so/whirlpools-client"
import BN from "bn.js"
import {
    ClmmLiquidityPoolState 
} from "../../interfaces"
import {
    Q128, Q64 
} from "@modules/utils"
import {
    DexId,
    OrcaLiquidityPoolMetadata,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    TickArrayService 
} from "./transactions"
import {
    Decimal 
} from "decimal.js"
import {
    ClmmFeesFormulaService 
} from "../../formulas"

@Injectable()
export class OrcaFeesService implements IFeesService {
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
        const tickLower = bot.activePosition.associatedPosition.tickLower ?? 0
        const tickUpper = bot.activePosition.associatedPosition.tickUpper ?? 0

        const { programAddress } =
      state.static.metadata as OrcaLiquidityPoolMetadata

        // ----------------------------
        // PDA derivation
        // ----------------------------
        const { pda: tickArrayLowerPda } =
      await this.tickArrayService.getPda({
          poolStateAddress: address(state.static.poolAddress),
          tickIndex: tickLower,
          tickSpacing: state.static.tickSpacing,
          bot,
          pdaOnly: true,
          programAddress: address(programAddress),
      })

        const { pda: tickArrayUpperPda } =
      await this.tickArrayService.getPda({
          poolStateAddress: address(state.static.poolAddress),
          tickIndex: tickUpper,
          tickSpacing: state.static.tickSpacing,
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
        const [positionState] = Position.struct.deserialize(
            Buffer.from(positionAccount.data),
            8,
        )

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
        const lowerStart = new BN(tickArrayLower.data.startTickIndex)
        const upperStart = new BN(tickArrayUpper.data.startTickIndex)

        const tickLowerIndex = new BN(tickLower)
            .sub(lowerStart)
            .div(new BN(state.static.tickSpacing))

        const tickUpperIndex = new BN(tickUpper)
            .sub(upperStart)
            .div(new BN(state.static.tickSpacing))

        const tickLowerData = tickArrayLower.data.ticks[tickLowerIndex.toNumber()]
        const tickUpperData = tickArrayUpper.data.ticks[tickUpperIndex.toNumber()]

        if (!bot.activePosition.associatedPosition.liquidity) {
            throw new MissingActivePositionLiquidityException(
                {
                    botId: bot.id,
                }
            )
        }

        const liquidity = new BN(bot.activePosition.associatedPosition.liquidity?.toString() ?? "0")

        const { feeA, feeB } = this.clmmFeesFormulaService.computeFees({
            // -------- Token A --------
            feeGrowthGlobal: _state.dynamic.feeGrowthGlobalA,
            feeGrowthOutsideLower: new BN(tickLowerData.feeGrowthOutsideA.toString()),
            feeGrowthOutsideUpper: new BN(tickUpperData.feeGrowthOutsideA.toString()),
            tickCurrent: _state.dynamic.tickCurrent,
            tickLower: new BN(tickLower),
            tickUpper: new BN(tickUpper),
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

        return {
            feeA,
            feeB,
            rewards: [],
            snapshotAt: state.dynamic.snapshotAt,
        }
    }
}