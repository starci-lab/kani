import {
    Injectable 
} from "@nestjs/common"
import BN from "bn.js"
import Decimal from "decimal.js"
import {
    ActiveIdToPriceParams,
    ActiveIdToPriceRawParams,
    ActiveIdToPriceRawResult,
    ActiveIdToPriceResult
} from "./types"

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
     * Converts active bin id to human-readable price.
     *
     * @param param - Parameters for converting active bin id to price
     * @returns Human-readable price (token A in terms of token B)
     */
    public activeIdToPrice({
        activeId,
        decimalsA,
        decimalsB,
        basisPointMax = 10000,
        binStep
    }: ActiveIdToPriceParams): ActiveIdToPriceResult {
        // Step 1: Compute raw DLMM price without token decimal normalization
        const { price: rawPrice } = this.activeIdToPriceRaw({
            activeId,
            binStep,
            basisPointMax,
        })

        // Step 2: Normalize price using token decimals
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
     * Converts active bin id to raw DLMM price (without decimals).
     *
     * @param param - Parameters for converting active bin id to raw price
     * @returns Raw DLMM price (without token decimals)
     */
    public activeIdToPriceRaw({
        activeId,
        binStep,
        basisPointMax = 10000,
    }: ActiveIdToPriceRawParams): ActiveIdToPriceRawResult {
        // Compute price ratio: (1 + binStep / basisPointMax)
        const ratio = new Decimal(1)
            .add(new Decimal(binStep).div(basisPointMax))

        // Raise ratio to the power of activeId
        const price = ratio.pow(activeId.toNumber())

        return {
            price 
        }
    }
}
