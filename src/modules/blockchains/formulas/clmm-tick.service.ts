import { Injectable } from "@nestjs/common"
import { BN, Decimal } from "turbos-clmm-sdk"
import { TickMath } from "@cetusprotocol/cetus-sui-clmm-sdk"

@Injectable()
export class ClmmTickFormulaService {
    public tickToSqrtPriceX64(
        {
            tickIndex,
        }: TickToSqrtPriceX64Params
    ): BN {
        // we use sui fomular with high-precision to calculate the sqrt price
        return TickMath.tickIndexToSqrtPriceX64(tickIndex.toNumber())
    }

    public sqrtPriceX64ToPrice(
        {
            sqrtPriceX64,
            decimalsA,
            decimalsB,
        }: SqrtPriceX64ToPriceParams
    ): Decimal {
        return TickMath.sqrtPriceX64ToPrice(sqrtPriceX64, decimalsA, decimalsB)
    }
    
}

export interface TickToSqrtPriceX64Params {
    tickIndex: Decimal
}

export interface SqrtPriceX64ToPriceParams {
    sqrtPriceX64: BN
    decimalsA: number
    decimalsB: number
}

export interface SqrtPriceX64ToPriceResponse {
    price: Decimal
}