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
import { TickArrayLayout } from "@raydium-io/raydium-sdk-v2"
import BN from "bn.js"
import { LiquidityPoolState } from "../../interfaces"
import {
    OrcaLiquidityPoolMetadata,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import { computeDenomination, Q64 } from "@utils"
import { Decimal } from "decimal.js"

@Injectable()
export class CetusFeesService implements IFeesService {
    constructor(
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly rpcExecutorService: RpcExecutorService,
    ) {}

    async fees({ bot, state }: FeesParams): Promise<FeesResponse> {
        const _state = state as LiquidityPoolState

        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException("Active position not found")
        }

        const positionId = bot.activePosition.positionId
        const tickLower = bot.activePosition.tickLower ?? 0
        const tickUpper = bot.activePosition.tickUpper ?? 0

        const { programAddress } = state.static.metadata as OrcaLiquidityPoolMetadata

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
        // BATCH FETCH: position + 2 tick arrays
        // ----------------------------
        const [
            positionAccount,
            tickArrayLowerAccount,
            tickArrayUpperAccount,
        ] = await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Http,
            callback: async ({ rpc }) => {
                return fetchEncodedAccounts(
                    rpc, [
                        address(positionId),
                        tickArrayLowerPda,
                        tickArrayUpperPda,
                    ]
                )
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
        const [positionState] = PersonalPositionState.struct.deserialize(
            Buffer.from(positionAccount.data),
            8,
        )

        const tickArrayLower = TickArrayLayout.decode(Buffer.from(tickArrayLowerAccount.data))
        const tickArrayUpper = TickArrayLayout.decode(Buffer.from(tickArrayUpperAccount.data))

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
        const lowerStart = tickArrayLower.startTickIndex
        const upperStart = tickArrayUpper.startTickIndex

        const tickLowerIndex = new Decimal(tickLower)
            .sub(lowerStart)
            .div(state.static.tickSpacing)

        const tickUpperIndex = new Decimal(tickUpper)
            .sub(upperStart)
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

        // ----------------------------
        // Fee growth inside
        // ----------------------------
        const feeGrowthInsideA = this.computeFeeGrowthInside(
            _state.dynamic.feeGrowthGlobalA,
            new BN(tickLowerData.feeGrowthOutsideX64A.toString()),
            new BN(tickUpperData.feeGrowthOutsideX64A.toString()),
            _state.dynamic.tickCurrent,
            tickLower,
            tickUpper,
        )

        const feeGrowthInsideB = this.computeFeeGrowthInside(
            _state.dynamic.feeGrowthGlobalB,
            new BN(tickLowerData.feeGrowthOutsideX64B.toString()),
            new BN(tickUpperData.feeGrowthOutsideX64B.toString()),
            _state.dynamic.tickCurrent,
            tickLower,
            tickUpper,
        )

        // ----------------------------
        // Position checkpoint
        // ----------------------------
        const feeGrowthInsideALastX64 = new BN(
            positionState.feeGrowthInside0LastX64.toString(),
        )
        const feeGrowthInsideBLastX64 = new BN(
            positionState.feeGrowthInside1LastX64.toString(),
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
            .mul(feeGrowthInsideA.sub(feeGrowthInsideALastX64))
            .div(Q64)

        const feeEarnedB = liquidity
            .mul(feeGrowthInsideB.sub(feeGrowthInsideBLastX64))
            .div(Q64)

        return {
            tokenA: computeDenomination(feeEarnedA, tokenA.decimals),
            tokenB: computeDenomination(feeEarnedB, tokenB.decimals),
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
        if (currentTick < tickLower) {
            return feeGrowthOutsideLower.sub(feeGrowthOutsideUpper)
        }

        if (currentTick >= tickUpper) {
            return feeGrowthOutsideUpper.sub(feeGrowthOutsideLower)
        }

        return feeGrowthGlobal
            .sub(feeGrowthOutsideLower)
            .sub(feeGrowthOutsideUpper)
    }
}