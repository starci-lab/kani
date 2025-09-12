import { computeDenomination, roundNumber } from "@modules/common"
import { Injectable } from "@nestjs/common"
import BN from "bn.js"

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

const ZAP_ELIGIBILITY_RATIO_THRESHOLD = 2 / 5

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
            return roundNumber(denominatedAmountA / denominatedAmountB)
        } else {
            return roundNumber(denominatedAmountB / denominatedAmountA)
        }
    }

    isZapEligible(
        params: IsZapEligibleParams
    ): boolean {
        const ratio = this.getAmountRatio(params)
        return ratio >= ZAP_ELIGIBILITY_RATIO_THRESHOLD
    }    
}