import { LiquidityPoolState } from "@modules/blockchains"
import { BotSchema } from "@modules/databases"
import Decimal from "decimal.js"
import { Injectable } from "@nestjs/common"
import { toUnitDecimal } from "@modules/common"
import BN from "bn.js"
import { TickMath } from "@cetusprotocol/cetus-sui-clmm-sdk"

const MAX_RANGE_FRACTION = new Decimal(1/3)

@Injectable()
export class TickService {
    private readonly Q64 = new Decimal(2).pow(64)

    public async getTickBounds(
        state: LiquidityPoolState,
        bot: BotSchema
    ) {
        const tickCurrent = new Decimal(state.dynamic.tickCurrent)
        const tickSpacing = new Decimal(state.static.tickSpacing)
        const tickMultiplier = new Decimal(state.static.tickMultiplier)

        const targetIsA = bot.targetToken.toString() === state.static.tokenA.toString()
        const F = new Decimal(MAX_RANGE_FRACTION)
    
        // 1. Calculate ideal widths
        let L: Decimal
        if (targetIsA) {
            L = tickMultiplier.mul(F).div(F.add(1))
        } else {
            L = tickMultiplier.div(F.add(1))
        }
        // 2. Raw tickLower
        let tickLower = tickCurrent.sub(L)
        // 3. Align LOWER bound only
        tickLower = tickLower.div(tickSpacing).floor().mul(tickSpacing)
        // 4. Exact tickUpper
        let tickUpper = tickLower.add(tickMultiplier)
        // 5. If tickUpper not aligned → shift tickLower so that tickUpper aligns
        if (!tickUpper.mod(tickSpacing).eq(0)) {
            // shift in direction THAT KEEPS skew
            tickLower = tickLower.sub(tickUpper.mod(tickSpacing))
            tickUpper = tickLower.add(tickMultiplier)
        }
        return {
            tickLower: tickLower,
            tickUpper: tickUpper,
        }
    }

    public sqrtPriceX64ToPrice(
        sqrtPriceX64: BN,
        decimalsA: number,
        decimalsB: number,
    ): Decimal {
        const sqrtPrice = new Decimal(sqrtPriceX64.toString())
        if (sqrtPrice.isZero()) {
            return new Decimal(0)
        }
        // ratio = sqrtPrice / 2^64
        const ratio = sqrtPrice.div(this.Q64)
        // price = ratio^2
        return ratio
            .pow(2)
            .div(toUnitDecimal(decimalsB - decimalsA))
    }

    public tickIndexToPrice(
        tickIndex: number,
        decimalsA: number,
        decimalsB: number,
    ): Decimal {
        const sqrtPriceX64 = TickMath.tickIndexToSqrtPriceX64(
            tickIndex,
        )
        return this.sqrtPriceX64ToPrice(
            sqrtPriceX64,
            decimalsA,
            decimalsB,
        )
    }
}

