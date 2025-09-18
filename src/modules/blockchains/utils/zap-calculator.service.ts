import { Injectable, Logger } from "@nestjs/common"
import BN from "bn.js"
import Decimal from "decimal.js"

export interface ZapCalculationParams {
    amountIn: BN             // total input (raw units, BN)
    ratio: Decimal           // ratio = amountB / amountA (Decimal)
    spotPrice: Decimal       // spot price (tokenB per tokenA)
    oraclePrice?: Decimal      // oracle price (tokenB per tokenA)
    priorityAOverB: boolean  // true: input is tokenA, false: input is tokenB
    decimalsA: number
    decimalsB: number
}

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
        priorityAOverB
    }: ZapCalculationParams): ZapCalculationResult { 
        console.log({
            decimalsA,
            decimalsB,
            amountIn,
            spotPrice,
            oraclePrice,
            ratio,
            priorityAOverB
        })
        const price = oraclePrice ?? spotPrice
        let swapAmount: BN
        let remainAmount: BN
        let receiveAmount: BN
        if (priorityAOverB) {
            // Input hoàn toàn là A
            // swapA = (ratio * OriginA) / (price + ratio)
            const originA = new Decimal(amountIn.toString()).div(new Decimal(10).pow(decimalsA))
            const swapA = ratio.mul(originA).div(price.add(ratio))
      
            swapAmount = new BN(swapA.mul(new Decimal(10).pow(decimalsA)).toFixed(0))
            remainAmount = amountIn.sub(swapAmount)
      
            const receiveB = swapA.mul(price)
            receiveAmount = new BN(receiveB.mul(new Decimal(10).pow(decimalsB)).toFixed(0))
        } else {
            // Input hoàn toàn là B
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