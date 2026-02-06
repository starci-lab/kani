import BN from "bn.js"
import {
    SuiObject,
    SuiObjectID,
    SuiObjectI128,
} from "../../../types"
import {
    parseSuiI128,
} from "../../../utils"

/** ---------- TICK (RAW) ---------- */

export interface TurbosSuiObjectTickFields {
    fee_growth_outside_a: string
    fee_growth_outside_b: string
    id: SuiObjectID
    initialized: boolean
    liquidity_gross: string
    liquidity_net: SuiObjectI128<`${string}::i128::I128`>
    reward_growths_outside: Array<string>
}

export type TurbosSuiObjectTick = SuiObject<
    TurbosSuiObjectTickFields,
    `${string}::tick::Tick`
>

/** ---------- TICK (PARSED) ---------- */

export interface TurbosTick {
    feeGrowthOutsideA: BN
    feeGrowthOutsideB: BN
    id: string
    initialized: boolean
    liquidityGross: BN
    liquidityNet: BN
    rewardGrowthsOutside: Array<BN>
}

/**
 * Parses a Turbos Tick Sui object into a TurbosTick interface
 */
export const parseTurbosTick = (target: TurbosSuiObjectTickFields): TurbosTick => {
    return {
        feeGrowthOutsideA: new BN(target.fee_growth_outside_a),
        feeGrowthOutsideB: new BN(target.fee_growth_outside_b),
        id: target.id.id,
        initialized: target.initialized,
        liquidityGross: new BN(target.liquidity_gross),
        liquidityNet: parseSuiI128(target.liquidity_net),
        rewardGrowthsOutside: target.reward_growths_outside.map((x) => new BN(x)),
    }
}