import { Injectable } from "@nestjs/common"
import BN from "bn.js"
import Decimal from "decimal.js"

export interface ZapCalculationResult {
    swapAmountIn: BN
    remainingAmountIn: BN
    receiveAmountOut: BN
}

export interface ZapCalculationParams {
    decimalsA: number,
    decimalsB: number,
    amountIn: BN,
    spotPrice: Decimal,
    oraclePrice: Decimal,
    ratio: Decimal,
    targetIsA: boolean,
}

const MAX_DEVIATION = new Decimal(0.05) // 5%

@Injectable()
export class ZapMathService {

    public calculateZapAmounts({
        decimalsA,
        decimalsB,
        amountIn,
        spotPrice,
        oraclePrice,
        ratio,
        targetIsA
    }: ZapCalculationParams): ZapCalculationResult { 
        const price = oraclePrice ?? spotPrice
        let swapAmountIn: BN
        let remainingAmountIn: BN
        let receiveAmountOut: BN
        if (targetIsA) {
            // target is A
            // swapA = (ratio * OriginA) / (price + ratio)
            const originA = new Decimal(amountIn.toString()).div(new Decimal(10).pow(decimalsA))
            const swapA = ratio.mul(originA).div(price.add(ratio))
      
            swapAmountIn = new BN(swapA.mul(new Decimal(10).pow(decimalsA)).toFixed(0))
            remainingAmountIn = amountIn.sub(swapAmountIn)
      
            const receiveB = swapA.mul(price)
            receiveAmountOut = new BN(receiveB.mul(new Decimal(10).pow(decimalsB)).toFixed(0))
        } else {
            // target is B
            // swapB = (price * OriginB) / (price + ratio)
            const originB = new Decimal(amountIn.toString()).div(new Decimal(10).pow(decimalsB))
            const swapB = price.mul(originB).div(price.add(ratio))
      
            swapAmountIn = new BN(swapB.mul(new Decimal(10).pow(decimalsB)).toFixed(0))
            remainingAmountIn = amountIn.sub(swapAmountIn)

            const receiveA = swapB.div(price)
            receiveAmountOut = new BN(receiveA.mul(new Decimal(10).pow(decimalsA)).toFixed(0))
        }
        return {
            swapAmountIn,
            remainingAmountIn,
            receiveAmountOut,
        }
    }

    public ensureZapAmounts(
        {
            actualAmountOut,
            expectedAmountOut
        }: EnsureZapAmountsParams
    ): EnsureZapAmountsResponse {
        const deviation = new Decimal(actualAmountOut.toString()).div(new Decimal(expectedAmountOut.toString())).sub(1).abs()
        return {
            deviation,
            isAcceptable: deviation.lte(MAX_DEVIATION),
        }       
    }
}

export interface EnsureZapAmountsParams {
    actualAmountOut: BN
    expectedAmountOut: BN
}

export interface EnsureZapAmountsResponse {
    deviation: Decimal
    isAcceptable: boolean
}