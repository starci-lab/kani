import BN from "bn.js"
import {
    parseSuiI64,
    parseSuiI128,
    SuiObject,
    SuiObjectI64,
    SuiObjectI128,
} from "../../../structs"

/** ---------- TICK INFO (RAW) ---------- */

export interface MomentumSuiObjectTickInfoFields {
    fee_growth_outside_x: string
    fee_growth_outside_y: string
    liquidity_gross: string
    liquidity_net: SuiObjectI128<`${string}::i128::I128`>
    reward_growths_outside: Array<string>
    seconds_out_side: string
    seconds_per_liquidity_out_side: string
    tick_cumulative_out_side: SuiObjectI64<`${string}::i64::I64`>
}

export type MomentumSuiObjectTickInfo = SuiObject<
    MomentumSuiObjectTickInfoFields,
    `${string}::tick::TickInfo`
>

/** ---------- TICK INFO (PARSED) ---------- */

export interface MomentumTickInfo {
    feeGrowthOutsideX: BN
    feeGrowthOutsideY: BN
    liquidityGross: BN
    liquidityNet: BN
    rewardGrowthsOutside: Array<BN>
    secondsOutside: BN
    secondsPerLiquidityOutside: BN
    tickCumulativeOutside: BN
}

/**
 * Parses a Momentum TickInfo Sui object into a MomentumTickInfo interface
 */
export const parseMomentumTickInfo = (
    target: MomentumSuiObjectTickInfoFields,
): MomentumTickInfo => {
    return {
        feeGrowthOutsideX: new BN(target.fee_growth_outside_x),
        feeGrowthOutsideY: new BN(target.fee_growth_outside_y),
        liquidityGross: new BN(target.liquidity_gross),
        liquidityNet: parseSuiI128(target.liquidity_net),
        rewardGrowthsOutside: target.reward_growths_outside.map((x) => new BN(x)),
        secondsOutside: new BN(target.seconds_out_side),
        secondsPerLiquidityOutside: new BN(target.seconds_per_liquidity_out_side),
        tickCumulativeOutside: parseSuiI64(target.tick_cumulative_out_side),
    }
}