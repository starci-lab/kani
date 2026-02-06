import BN from "bn.js"
import {
    parseSuiI64,
    parseSuiI128,
    SuiObject,
    SuiObjectI64,
    SuiObjectI128,
} from "../../../structs"

/**
 * Represents the raw fields of a FlowX TickInfo Sui object.
 * This interface matches the exact structure returned from Sui blockchain.
 */
export interface FlowXSuiObjectTickInfoFields {
    /** Fee growth outside X (u128 as string). */
    fee_growth_outside_x: string
    /** Fee growth outside Y (u128 as string). */
    fee_growth_outside_y: string
    /** Liquidity gross (u128 as string). */
    liquidity_gross: string
    /** Liquidity net (i128 object). */
    liquidity_net: SuiObjectI128<`${string}::i128::I128`>
    /** Array of reward growths outside (u128 as string array). */
    reward_growths_outside: Array<string>
    /** Seconds outside (u64 as string). */
    seconds_out_side: string
    /** Seconds per liquidity outside (u128 as string). */
    seconds_per_liquidity_out_side: string
    /** Tick cumulative outside (i64 object). */
    tick_cumulative_out_side: SuiObjectI64<`${string}::i64::I64`>
}

/**
 * Type alias for FlowX TickInfo Sui object.
 */
export type FlowXSuiObjectTickInfo = SuiObject<
    FlowXSuiObjectTickInfoFields,
    `${string}::tick::TickInfo`
>

/**
 * Parsed FlowX tick info interface with normalized field names and BN types.
 */
export interface FlowXTickInfo {
    /** Fee growth outside X. */
    feeGrowthOutsideX: BN
    /** Fee growth outside Y. */
    feeGrowthOutsideY: BN
    /** Liquidity gross. */
    liquidityGross: BN
    /** Liquidity net. */
    liquidityNet: BN
    /** Array of reward growths outside. */
    rewardGrowthsOutside: Array<BN>
    /** Seconds outside. */
    secondsOutside: BN
    /** Seconds per liquidity outside. */
    secondsPerLiquidityOutside: BN
    /** Tick cumulative outside. */
    tickCumulativeOutside: BN
}

/**
 * Parses a FlowX TickInfo Sui object into a normalized FlowXTickInfo interface.
 *
 * @param target - The raw FlowX tick info fields from Sui object
 * @returns Parsed tick info with normalized field names and BN types
 *
 * @example
 * const tickInfo = parseFlowXTickInfo(suiObject.content.fields.value.fields)
 */
export const parseFlowXTickInfo = (
    target: FlowXSuiObjectTickInfoFields,
): FlowXTickInfo => {
    return {
        feeGrowthOutsideX: new BN(target.fee_growth_outside_x),
        feeGrowthOutsideY: new BN(target.fee_growth_outside_y),
        liquidityGross: new BN(target.liquidity_gross),
        liquidityNet: parseSuiI128(target.liquidity_net),
        rewardGrowthsOutside: target.reward_growths_outside.map((rewardGrowthsIutside) => new BN(rewardGrowthsIutside)),
        secondsOutside: new BN(target.seconds_out_side),
        secondsPerLiquidityOutside: new BN(target.seconds_per_liquidity_out_side),
        tickCumulativeOutside: parseSuiI64(target.tick_cumulative_out_side),
    }
}