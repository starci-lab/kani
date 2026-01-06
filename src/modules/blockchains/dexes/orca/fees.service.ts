import { FeesParams, FeesResponse, IFeesService } from "../../interfaces"
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
import { LiquidityPoolState } from "../../interfaces"
import { Q128, Q64 } from "@utils"
import {
    OrcaLiquidityPoolMetadata,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import { computeDenomination } from "@utils"
import { TickArrayService } from "./transactions"
import { Decimal } from "decimal.js"

@Injectable()
export class OrcaFeesService implements IFeesService {
    constructor(
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly rpcExecutorService: RpcExecutorService,
    private readonly tickArrayService: TickArrayService,
    ) {}

    async fees({ bot, state }: FeesParams): Promise<FeesResponse> {
        const _state = state as LiquidityPoolState

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
            accessType: RpcAccessType.Read,
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
        const tokenA = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === _state.static.tokenA.toString(),
        )
        const tokenB = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === _state.static.tokenB.toString(),
        )

        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException(
                "Either token A or token B is not in the pool",
            )
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

        // ----------------------------
        // Fee growth inside
        // ----------------------------
        const feeGrowthInsideA = this.computeFeeGrowthInside(
            _state.dynamic.feeGrowthGlobalA,
            new BN(tickLowerData.feeGrowthOutsideA.toString()),
            new BN(tickUpperData.feeGrowthOutsideA.toString()),
            _state.dynamic.tickCurrent,
            tickLower,
            tickUpper,
        )

        const feeGrowthInsideB = this.computeFeeGrowthInside(
            _state.dynamic.feeGrowthGlobalB,
            new BN(tickLowerData.feeGrowthOutsideB.toString()),
            new BN(tickUpperData.feeGrowthOutsideB.toString()),
            _state.dynamic.tickCurrent,
            tickLower,
            tickUpper,
        )
        // ----------------------------
        // Position checkpoint
        // ----------------------------
        const feeGrowthCheckpointA = new BN(
            positionState.feeGrowthCheckpointA.toString(),
        )
        const feeGrowthCheckpointB = new BN(
            positionState.feeGrowthCheckpointB.toString(),
        )

        if (!bot.activePosition.liquidity) {
            throw new ActivePositionLiquidityNotSetException(
                bot.id,
                "Active position liquidity not set",
            )
        }

        const liquidity = new BN(bot.activePosition.liquidity)

        // ----------------------------
        // Fee calculation
        // ----------------------------
        const feeEarnedA = liquidity
            .mul(feeGrowthInsideA.sub(feeGrowthCheckpointA))
            .div(Q64)

        const feeEarnedB = liquidity
            .mul(feeGrowthInsideB.sub(feeGrowthCheckpointB))
            .div(Q64)

        return {
            tokenA: computeDenomination(feeEarnedA, tokenA.decimals),
            tokenB: computeDenomination(feeEarnedB, tokenB.decimals),
            snapshotAt: state.dynamic.snapshotAt,
        }
    }

    computeFeeGrowthInside(
        feeGrowthGlobal: BN,
        feeGrowthOutsideLower: BN,
        feeGrowthOutsideUpper: BN,
        currentTick: number,
        tickLower: number,
        tickUpper: number,
    ): BN {
        // current price below range
        if (currentTick < tickLower) {
            return this.subQ128(
                feeGrowthOutsideLower,
                feeGrowthOutsideUpper,
            )
        }
    
        // current price above range
        if (currentTick >= tickUpper) {
            return this.subQ128(
                feeGrowthOutsideUpper,
                feeGrowthOutsideLower,
            )
        }
    
        // current price inside range
        return this.subQ128(
            this.subQ128(feeGrowthGlobal, feeGrowthOutsideLower),
            feeGrowthOutsideUpper,
        )
    }

    // ----------------------------
    // u128 subtraction (mod 2^128)
    // ----------------------------
    private subQ128(a: BN, b: BN): BN {
        return a.sub(b).umod(Q128)
    }
}