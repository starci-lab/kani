import { computeDenomination } from "@modules/common"
import { Injectable } from "@nestjs/common"
import BN from "bn.js"
import Decimal from "decimal.js"

export interface TokenData {
    tokenDecimals: number
    amount: BN
}

export interface GetAmountRatioParams {
    tokenA: TokenData
    tokenB: TokenData
    priorityAOverB: boolean
}

export type IsZapEligibleParams = GetAmountRatioParams

const ZAP_ELIGIBILITY_RATIO_THRESHOLD = new Decimal(2 / 5)

@Injectable()
export class PriceRatioService {
    constructor() { }

    getAmountRatio(
        {
            priorityAOverB,
            tokenA,
            tokenB
        }: GetAmountRatioParams
    ) {
        const denominatedAmountA = computeDenomination(
            tokenA.amount, 
            tokenA.tokenDecimals
        )
        const denominatedAmountB = computeDenomination(
            tokenB.amount, 
            tokenB.tokenDecimals
        )
        if (priorityAOverB) {
            return denominatedAmountA.div(denominatedAmountB)
        } else {
            return denominatedAmountB.div(denominatedAmountA)
        }
    }

    isZapEligible(
        params: IsZapEligibleParams
    ): boolean {
        const ratio = this.getAmountRatio(params)
        return ratio.gte(ZAP_ELIGIBILITY_RATIO_THRESHOLD)
    }    
}