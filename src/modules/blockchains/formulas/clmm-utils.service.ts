import {
    Injectable 
} from "@nestjs/common"
import {
    Q128, Q64 
} from "@utils"
import BN from "bn.js"

/**
 * CLMM Utility Service
 *
 * Common low-level helpers used across CLMM math.
 *
 * Currently provides:
 *  - wrapping arithmetic (unsigned overflow semantics)
 *
 * This service is designed to mirror on-chain `u128::wrapping_sub`
 * behavior used in CLMM protocols (Uniswap V3-style).
 */
@Injectable()
export class ClmmUtilsService {

    /**
     * Perform wrapping subtraction: (a - b) mod wrapModulus
     *
     * This mimics on-chain unsigned integer overflow behavior.
     *
     * Example:
     *  - If a < b, the result wraps around instead of becoming negative.
     *
     * Typical usage:
     *  - Fee growth math (wrapModulus = Q128 or Q64)
     *  - Reward/points growth math when the underlying on-chain type uses wrapping arithmetic
     *
     * @param a - Minuend
     * @param b - Subtrahend
     * @param wrapModulus - Overflow modulus (e.g. Q128 = 2^128, Q64 = 2^64)
     * @returns (a - b) modulo wrapModulus
     */
    public wrapSub(
        a: BN,
        b: BN,
        wrapModulus: typeof Q128 | typeof Q64
    ): BN {
        return a.sub(b).umod(wrapModulus)
    }
}
