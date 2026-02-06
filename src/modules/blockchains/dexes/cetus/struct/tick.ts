import BN from "bn.js"
import { 
    parseSuiI128, 
    parseSuiI32, 
    SuiObject, 
    SuiObjectI128, 
    SuiObjectI32 
} from "../../../structs"

/**
 * Fields structure for Cetus tick Sui object.
 * Represents a price tick in a liquidity pool.
 */
export interface CetusSuiObjectTickFields {
    /** Fee growth outside for token A. */
    fee_growth_outside_a: string
    /** Fee growth outside for token B. */
    fee_growth_outside_b: string
    /** Tick index. */
    index: SuiObjectI32<`${string}::i32::I32`>
    /** Gross liquidity at this tick. */
    liquidity_gross: string
    /** Net liquidity at this tick. */
    liquidity_net: SuiObjectI128<`${string}::i128::I128`>
    /** Points growth outside. */
    points_growth_outside: string
    /** Array of rewards growth outside. */
    rewards_growth_outside: Array<string>
    /** Square root price at this tick. */
    sqrt_price: string
}

/**
 * Cetus tick Sui object type.
 */
export type CetusSuiObjectTick = SuiObject<CetusSuiObjectTickFields, `${string}::tick::Tick`>

/**
 * Parsed Cetus tick interface.
 * Contains parsed tick information with converted types.
 */
export interface CetusTick {
    /** Fee growth outside for token A. */
    feeGrowthOutsideA: BN
    /** Fee growth outside for token B. */
    feeGrowthOutsideB: BN
    /** Tick index. */
    index: BN
    /** Gross liquidity at this tick. */
    liquidityGross: BN
    /** Net liquidity at this tick. */
    liquidityNet: BN
    /** Points growth outside. */
    pointsGrowthOutside: BN
    /** Array of parsed rewards growth outside. */
    rewardsGrowthOutside: Array<BN>
    /** Square root price at this tick. */
    sqrtPrice: BN
}

/**
 * Parses Cetus tick Sui object fields into a parsed interface.
 *
 * @param target - Raw Sui object fields
 * @returns Parsed tick
 *
 * @example
 * const parsed = parseCetusTick(tickFields)
 */
export const parseCetusTick = (target: CetusSuiObjectTickFields): CetusTick => {
    return {
        feeGrowthOutsideA: new BN(target.fee_growth_outside_a),
        feeGrowthOutsideB: new BN(target.fee_growth_outside_b),
        index: parseSuiI32(target.index),
        liquidityGross: new BN(target.liquidity_gross),
        liquidityNet: parseSuiI128(target.liquidity_net),
        pointsGrowthOutside: new BN(target.points_growth_outside),
        rewardsGrowthOutside: target.rewards_growth_outside.map((growthOutside) => new BN(growthOutside)),
        sqrtPrice: new BN(target.sqrt_price),
    }
}