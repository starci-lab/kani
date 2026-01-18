import {
    Injectable 
} from "@nestjs/common"
import Decimal from "decimal.js"

/**
 * DLMM Bin Formula Service
 *
 * This service implements price calculation for DLMM-style AMMs.
 *
 * DLMM does NOT use ticks like CLMM.
 * Instead, price is discretized into bins indexed by `activeId`.
 */
@Injectable()
export class DlmmBinFormulaService {

    /**
     * Convert active bin id to human-readable price
     *
     * Formula:
     *   price =
     *     (1 + binStep / basisPointMax) ^ activeId
     *     × 10^(decimalsA - decimalsB)
     *
     * Where:
     *  - activeId: current bin index
     *  - binStep: price step per bin (in basis points)
     *  - basisPointMax: 10_000 by default
     *  - decimalsA / decimalsB: token decimals normalization
     *
     * Returned price:
     *  - price of token A in terms of token B
     */
    public activeIdToPrice(
        { 
            activeId, 
            decimalsA, 
            decimalsB, 
            basisPointMax = 10000, 
            binStep 
        }: ActiveIdToPriceParams
    ): ActiveIdToPriceResult {

        // Step 1:
        // Compute raw DLMM price without token decimal normalization
        const { price: rawPrice } = this.activeIdToPriceRaw({
            activeId,
            binStep,
            basisPointMax,
        })

        // Step 2:
        // Normalize price using token decimals
        // price = rawPrice × 10^(decimalsA - decimalsB)
        const price = rawPrice.mul(
            new Decimal(10).pow(
                new Decimal(decimalsA).sub(decimalsB)
            )
        )

        return {
            price 
        }
    }

    /**
     * Convert active bin id to raw DLMM price (without decimals)
     *
     * Raw formula:
     *   rawPrice = (1 + binStep / basisPointMax) ^ activeId
     *
     * Notes:
     *  - This price is purely mathematical
     *  - Token decimals are NOT applied here
     *  - Useful for internal math or comparison between bins
     */
    public activeIdToPriceRaw(
        { 
            activeId, 
            binStep,
            basisPointMax = 10000,
        }: ActiveIdToPriceRawParams
    ): ActiveIdToPriceRawResult {

        const ratio = new Decimal(1)
            .add(new Decimal(binStep).div(basisPointMax))

        const price = ratio.pow(activeId)

        return {
            price 
        }
    }
}

/**
 * Params for converting active bin id to price (with decimals)
 */
export interface ActiveIdToPriceParams {

    /**
     * Active bin index (DLMM discrete price level)
     */
    activeId: number

    /**
     * Decimals of token A
     */
    decimalsA: number

    /**
     * Decimals of token B
     */
    decimalsB: number

    /**
     * Basis points denominator (default: 10_000)
     */
    basisPointMax?: number

    /**
     * Bin step in basis points
     * Example:
     *  - binStep = 25  -> 0.25% per bin
     */
    binStep: number
}

/**
 * Params for converting active bin id to raw price
 */
export interface ActiveIdToPriceRawParams {

    /**
     * Active bin index
     */
    activeId: number

    /**
     * Bin step in basis points
     */
    binStep: number

    /**
     * Basis points denominator
     */
    basisPointMax?: number
}

export interface ActiveIdToPriceRawResult {
    /**
     * Raw DLMM price (without decimals)
     */
    price: Decimal
}

export interface ActiveIdToPriceResult {
    /**
     * Human-readable price (token A / token B)
     */
    price: Decimal
}