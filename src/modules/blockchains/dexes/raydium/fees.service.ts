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
import { ClmmFeesFormulaService } from "../../formulas"

@Injectable()
export class RaydiumFeesService implements IFeesService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly tickArrayService: TickArrayService,
        private readonly clmmFeesFormulaService: ClmmFeesFormulaService,
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

        if (!positionState.liquidity) {
            throw new ActivePositionLiquidityNotSetException(
                bot.id,
                "Position liquidity not set",
            )
        }

        const liquidity = new BN(positionState.liquidity.toString())

        const { amountA, amountB } = this.clmmFeesFormulaService.computeFees({
            feeGrowthGlobal: _state.dynamic.feeGrowthGlobalA,
            feeGrowthOutsideLower: new BN(tickLowerData.feeGrowthOutsideX64A.toString()),
            feeGrowthOutsideUpper: new BN(tickUpperData.feeGrowthOutsideX64A.toString()),
            currentTick: new Decimal(_state.dynamic.tickCurrent.toString()),
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
        })

        return {
            reserveA: computeDenomination(amountA, tokenA.decimals),
            reserveB: computeDenomination(amountB, tokenB.decimals),
            rewards: [],
            snapshotAt: state.dynamic.snapshotAt,
        }
    }
}
