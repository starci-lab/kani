import { FeesParams, FeesResult, IFeesService } from "../../interfaces"
import { Injectable } from "@nestjs/common"
import { RpcExecutorService } from "../../clients"
import { RpcAccessType } from "@modules/filesystem"
import {
    address,
    fetchEncodedAccounts,
} from "@solana/kit"
import {
    ActivePositionLiquidityNotSetException,
    ActivePositionNotFoundException,
    InvalidPoolTokensException,
    PositionNotFoundException,
    TickArrayNotFoundException,
} from "@exceptions"
import { Position } from "./beets"
import { decodeTickArray } from "@orca-so/whirlpools-client"
import BN from "bn.js"
import { ClmmLiquidityPoolState } from "../../interfaces"
import { Q128, Q64 } from "@utils"
import {
    OrcaLiquidityPoolMetadata,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import { computeDenomination } from "@utils"
import { TickArrayService } from "./transactions"
import { Decimal } from "decimal.js"
import { ClmmFeesFormulaService } from "../../formulas"

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

        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException("Active position not found")
        }

        const positionId = bot.activePosition.positionId
        const tickLower = bot.activePosition.tickLower ?? 0
        const tickUpper = bot.activePosition.tickUpper ?? 0

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
                return fetchEncodedAccounts(rpc, [
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
            throw new PositionNotFoundException("Position not found")
        }

        if (!tickArrayLowerAccount || !tickArrayLowerAccount.exists) {
            throw new TickArrayNotFoundException(
                tickLower,
                "Lower tick array not found",
            )
        }

        if (!tickArrayUpperAccount || !tickArrayUpperAccount.exists) {
            throw new TickArrayNotFoundException(
                tickUpper,
                "Upper tick array not found",
            )
        }

        // ----------------------------
        // Decode accounts
        // ----------------------------
        const [positionState] = Position.struct.deserialize(
            Buffer.from(positionAccount.data),
            8,
        )

        const tickArrayLower = decodeTickArray(tickArrayLowerAccount)
        const tickArrayUpper = decodeTickArray(tickArrayUpperAccount)

        // ----------------------------
        // Token validation
        // ----------------------------
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: _state.static.tokenA.toString(),
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: _state.static.tokenB.toString(),
        })

        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException()
        }

        // ----------------------------
        // Tick index resolution
        // ----------------------------
        const lowerStart = tickArrayLower.data.startTickIndex
        const upperStart = tickArrayUpper.data.startTickIndex

        const tickLowerIndex = new Decimal(tickLower)
            .sub(lowerStart)
            .div(state.static.tickSpacing)

        const tickUpperIndex = new Decimal(tickUpper)
            .sub(upperStart)
            .div(state.static.tickSpacing)

        if (
            tickLowerIndex.lessThan(0) ||
      tickLowerIndex.greaterThanOrEqualTo(
          tickArrayLower.data.ticks.length,
      )
        ) {
            throw new Error("Lower tick index out of range")
        }

        if (
            tickUpperIndex.lessThan(0) ||
      tickUpperIndex.greaterThanOrEqualTo(
          tickArrayUpper.data.ticks.length,
      )
        ) {
            throw new Error("Upper tick index out of range")
        }
        const tickLowerData = tickArrayLower.data.ticks[tickLowerIndex.toNumber()]
        const tickUpperData = tickArrayUpper.data.ticks[tickUpperIndex.toNumber()]

        if (!bot.activePosition.liquidity) {
            throw new ActivePositionLiquidityNotSetException(
                bot.id,
                "Active position liquidity not set",
            )
        }

        const liquidity = new BN(bot.activePosition.liquidity)

        const { amountA, amountB } = this.clmmFeesFormulaService.computeFees({
            // -------- Token A --------
            feeGrowthGlobal: _state.dynamic.feeGrowthGlobalA,
            feeGrowthOutsideLower: new BN(tickLowerData.feeGrowthOutsideA.toString()),
            feeGrowthOutsideUpper: new BN(tickUpperData.feeGrowthOutsideA.toString()),
            tickCurrent: new Decimal(_state.dynamic.tickCurrent.toString()),
            tickLower: new Decimal(tickLower),
            tickUpper: new Decimal(tickUpper),
            feeGrowthInsideLastA: new BN(positionState.feeGrowthCheckpointA.toString()),
            feeGrowthInsideLastB: new BN(positionState.feeGrowthCheckpointB.toString()),
            liquidity,
            feeOwnedA: new BN(0),
            feeOwnedB: new BN(0),
            outsideDeltaWrapModulus: Q128,
            insideDeltaWrapModulus: Q128,
            resultDiv: Q64,
        })

        return {
            reserveA: computeDenomination(amountA, tokenA.decimals),
            reserveB: computeDenomination(amountB, tokenB.decimals),
            rewards: [],
            snapshotAt: state.dynamic.snapshotAt,
        }
    }
}