import { Injectable } from "@nestjs/common"
import Decimal from "decimal.js"

@Injectable()
export class DlmmBinFormulaService {
    public activeIdToPrice(
        { 
            activeId, 
            decimalsA, 
            decimalsB, 
            basisPointMax = 10000, 
            binStep 
        }: ActiveIdToPriceParams
    ): ActiveIdToPriceResponse {
        // ?: price = (1 + binStep / basisPointMax)^activeId * 10^(decimalsA - decimalsB)
        const base = new Decimal(1).add(
            new Decimal(binStep).div(basisPointMax)
        )
        const rawPrice = base.pow(activeId)
        const price = rawPrice.mul(
            new Decimal(10).pow(new Decimal(decimalsA).sub(decimalsB))
        )
        return { price }
    }
}

export interface ActiveIdToPriceParams {
    activeId: number
    decimalsA: number
    decimalsB: number
    basisPointMax?: number
    binStep: number
}

export interface ActiveIdToPriceResponse {
    price: Decimal
}