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
import { TickArrayLayout } from "@raydium-io/raydium-sdk-v2"
import BN from "bn.js"
import { LiquidityPoolState } from "../../interfaces"
import {
    OrcaLiquidityPoolMetadata,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import { computeDenomination, Q128, Q64 } from "@utils"
import { TickArrayService } from "./transactions"
import { Decimal } from "decimal.js"
import { PersonalPositionState } from "./beets"

@Injectable()
export class RaydiumFeesService implements IFeesService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly tickArrayService: TickArrayService,
    ) {}

    async fees({ bot, state }: FeesParams): Promise<FeesResult> {
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
                fetchEncodedAccounts(rpc, [
                    address(positionId),
                    tickArrayLowerPda,
                    tickArrayUpperPda,
                ]),
        })

        if (!positionAccount?.exists) {
            throw new PositionNotFoundException("Position not found")
        }

        if (!tickArrayLowerAccount?.exists) {
            throw new TickArrayNotFoundException(
                tickLower,
                "Lower tick array not found",
            )
        }

        if (!tickArrayUpperAccount?.exists) {
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

        const tickArrayLower = TickArrayLayout.decode(
            Buffer.from(tickArrayLowerAccount.data),
        )
        const tickArrayUpper = TickArrayLayout.decode(
            Buffer.from(tickArrayUpperAccount.data),
        )

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

        if (!positionState.liquidity) {
            throw new ActivePositionLiquidityNotSetException(
                bot.id,
                "Position liquidity not set",
            )
        }

        const liquidity = new BN(positionState.liquidity.toString())

        // ----------------------------
        // Fee calculation (WRAPPED)
        // ----------------------------
        const feeGrowthDeltaA = this.subQ128(
            feeGrowthInsideA,
            feeGrowthInsideALastX64,
        )

        const feeGrowthDeltaB = this.subQ128(
            feeGrowthInsideB,
            feeGrowthInsideBLastX64,
        )

        const feeEarnedA = liquidity.mul(feeGrowthDeltaA).div(Q64)
        const feeEarnedB = liquidity.mul(feeGrowthDeltaB).div(Q64)

        return {
            tokenA: computeDenomination(feeEarnedA, tokenA.decimals),
            tokenB: computeDenomination(feeEarnedB, tokenB.decimals),
            snapshotAt: state.dynamic.snapshotAt,
        }
    }

    // ----------------------------
    // Fee growth inside (CLMM spec)
    // ----------------------------
    computeFeeGrowthInside(
        feeGrowthGlobal: BN,
        feeGrowthOutsideLower: BN,
        feeGrowthOutsideUpper: BN,
        currentTick: number,
        tickLower: number,
        tickUpper: number,
    ): BN {
        if (currentTick < tickLower) {
            return this.subQ128(
                feeGrowthOutsideLower,
                feeGrowthOutsideUpper,
            )
        }

        if (currentTick >= tickUpper) {
            return this.subQ128(
                feeGrowthOutsideUpper,
                feeGrowthOutsideLower,
            )
        }

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
