import Decimal from "decimal.js"
import { Injectable } from "@nestjs/common"
import { toUnitDecimal } from "@modules/common"
import BN from "bn.js"
import { TickMath } from "@cetusprotocol/cetus-sui-clmm-sdk"
import { Q64 } from "./constants"

const MAX_RANGE_FRACTION = new Decimal(1 / 3)

@Injectable()
export class TickMathService {

    public async getTickBounds(
        {
            tickCurrent,
            tickSpacing,
            targetIsA,
            tickMultiplier,
        }: GetTickBoundsParams
    ): Promise<GetTickBoundsResponse> {
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
        params: SqrtPriceX64ToPriceParams
    ): SqrtPriceX64ToPriceResponse {
        const { sqrtPriceX64, decimalsA, decimalsB } = params

        const sqrtPrice = new Decimal(sqrtPriceX64.toString())
        if (sqrtPrice.isZero()) {
            return { price: new Decimal(0) }
        }

        // ratio = sqrtPrice / 2^64
        const ratio = sqrtPrice.div(Q64)

        // price = ratio^2 * 10^(decimalsA - decimalsB)
        return {
            price: ratio.pow(2).div(toUnitDecimal(decimalsB - decimalsA)),
        }
    }

    public tickIndexToPrice(
        params: TickIndexToPriceParams
    ): TickIndexToPriceResponse {
        const { tickIndex, decimalsA, decimalsB } = params
        const sqrtPriceX64 = TickMath.tickIndexToSqrtPriceX64(tickIndex)
        return this.sqrtPriceX64ToPrice({
            sqrtPriceX64,
            decimalsA,
            decimalsB,
        })
    }
}

export interface TickIndexToPriceParams {
    tickIndex: number
    decimalsA: number
    decimalsB: number
}

export interface TickIndexToPriceResponse {
    price: Decimal
}

export interface SqrtPriceX64ToPriceParams {
    sqrtPriceX64: BN
    decimalsA: number
    decimalsB: number
}

export interface SqrtPriceX64ToPriceResponse {
    price: Decimal
}

export interface GetTickBoundsParams {
    tickCurrent: Decimal
    tickSpacing: Decimal
    targetIsA: boolean
    tickMultiplier: Decimal
}

export interface GetTickBoundsResponse {
    tickLower: Decimal
    tickUpper: Decimal
}