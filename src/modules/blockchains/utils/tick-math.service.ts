import { Injectable } from "@nestjs/common"
import Decimal from "decimal.js"
import BN from "bn.js"
import { toUnitDecimal } from "@modules/common"

@Injectable()
export class TickMathService {
    private readonly Q64 = new Decimal(2).pow(64)
    private readonly MAX_SQRT_PRICE = new Decimal(
        "79226673515401279992447579055",
    )
    private readonly MIN_SQRT_PRICE = new Decimal("4295048016")

    /**
   * Convert sqrtPriceX64 (Q64.64 fixed-point) into actual price.
   * Returns price = tokenB per 1 tokenA.
   */
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
}
