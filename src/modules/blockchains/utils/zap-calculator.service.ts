import { Injectable, Logger } from "@nestjs/common"
import BN from "bn.js"
import Decimal from "decimal.js"
import { ZapCalculationParams } from "./pool-math.service"

export interface ZapCalculationResult {
    swapAmount: BN
    remainAmount: BN
    receiveAmount: BN
}

@Injectable()
export class ZapCalculatorService {
    private readonly logger = new Logger(ZapCalculatorService.name)
    private readonly Q64 = new BN(2).pow(new BN(64))
    
    constructor() {}

    calculateZapAmounts({
        decimalsA,
        decimalsB,
        amountIn,
        spotPrice,
        oraclePrice,
        ratio,
        targetIsA
    }: ZapCalculationParams): ZapCalculationResult { 
        const price = oraclePrice ?? spotPrice
        let swapAmount: BN
        let remainAmount: BN
        let receiveAmount: BN
        if (targetIsA) {
            // target is A
            // swapA = (ratio * OriginA) / (price + ratio)
            const originA = new Decimal(amountIn.toString()).div(new Decimal(10).pow(decimalsA))
            const swapA = ratio.mul(originA).div(price.add(ratio))
      
            swapAmount = new BN(swapA.mul(new Decimal(10).pow(decimalsA)).toFixed(0))
            remainAmount = amountIn.sub(swapAmount)
      
            const receiveB = swapA.mul(price)
            receiveAmount = new BN(receiveB.mul(new Decimal(10).pow(decimalsB)).toFixed(0))
        } else {
            // target is B
            // swapB = (price * OriginB) / (price + ratio)
            const originB = new Decimal(amountIn.toString()).div(new Decimal(10).pow(decimalsB))
            const swapB = price.mul(originB).div(price.add(ratio))
      
            swapAmount = new BN(swapB.mul(new Decimal(10).pow(decimalsB)).toFixed(0))
            remainAmount = amountIn.sub(swapAmount)

            const receiveA = swapB.div(price)
            receiveAmount = new BN(receiveA.mul(new Decimal(10).pow(decimalsA)).toFixed(0))
        }
        return {
            swapAmount,
            remainAmount,
            receiveAmount,
        }
    }
      
}