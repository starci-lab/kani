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
        const { price: rawPrice } = this.activeIdToPriceRaw({
            activeId,
            binStep,
            basisPointMax,
        })
        const price = rawPrice.mul(
            new Decimal(10).pow(new Decimal(decimalsA).sub(decimalsB))
        )
        return { price }
    }

    public activeIdToPriceRaw(
        { 
            activeId, 
            binStep,
            basisPointMax = 10000,
        }: ActiveIdToPriceRawParams
    ): ActiveIdToPriceRawResponse {
        return { price: new Decimal(1).add(new Decimal(binStep).div(basisPointMax)).pow(activeId) }
    }
}

export interface ActiveIdToPriceParams {
    activeId: number
    decimalsA: number
    decimalsB: number
    basisPointMax?: number
    binStep: number
}

export interface ActiveIdToPriceRawParams {
    activeId: number
    binStep: number
    basisPointMax?: number
}

export interface ActiveIdToPriceRawResponse {
    price: Decimal
}

export interface ActiveIdToPriceResponse {
    price: Decimal
}