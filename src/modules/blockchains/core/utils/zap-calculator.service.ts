import { Injectable } from "@nestjs/common"
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
    private readonly Q64 = new BN(2).pow(new BN(64))

    calculateZapAmounts(params: ZapCalculationParams): ZapCalculationResult {
        
    }
}