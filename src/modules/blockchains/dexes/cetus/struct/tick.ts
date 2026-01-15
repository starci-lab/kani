import type {
    CetusSuiDynamicFieldObjectData,
    CetusSuiDynamicFieldObjectResponse,
    CetusSuiSkipListNode,
    SuiObjectI128,
    SuiObjectI32,
    SuiObjectID,
} from "./types"
import BN from "bn.js"
import { parseI32 } from "@utils"

/** ========== CETUS TICK (dynamic_field::Field<u64, skip_list::Node<Tick>>) ========== */

export interface CetusSuiTickMoveObject {
    type: string
    fields: {
        fee_growth_outside_a: string
        fee_growth_outside_b: string
        index: SuiObjectI32
        liquidity_gross: string
        liquidity_net: SuiObjectI128
        points_growth_outside: string
        rewards_growth_outside: Array<string>
        sqrt_price: string
    }
}

export interface Tick {
    feeGrowthOutsideA: BN
    feeGrowthOutsideB: BN
    index: BN
    liquidityGross: BN
    liquidityNet: BN
    pointsGrowthOutside: BN
    rewardsGrowthOutside: Array<BN>
}

export interface CetusSuiTickDynamicFieldFields {
    id: SuiObjectID
    /** dynamic field name (tick score), returned as string even though it's u64 */
    name: string
    value: CetusSuiSkipListNode<CetusSuiTickMoveObject>
}

export type CetusSuiTickDynamicFieldObjectResponse =
    CetusSuiDynamicFieldObjectResponse<CetusSuiTickDynamicFieldFields>

/** Convenience alias for `response.data` */
export type CetusSuiTickDynamicFieldObjectData =
    CetusSuiDynamicFieldObjectData<CetusSuiTickDynamicFieldFields>

export const parseCetusTickDynamicFieldObjectData = (
    raw: CetusSuiTickDynamicFieldObjectData,
): Tick => {
    try {
        const tick = raw.content.fields.value.fields.value.fields
        return {
            feeGrowthOutsideA: new BN(tick.fee_growth_outside_a),
            feeGrowthOutsideB: new BN(tick.fee_growth_outside_b),
            index: new BN(parseI32(tick.index.fields.bits).toString()),
            liquidityGross: new BN(tick.liquidity_gross),
            liquidityNet: new BN(tick.liquidity_net.fields.bits),
            pointsGrowthOutside: new BN(tick.points_growth_outside),
            rewardsGrowthOutside: tick.rewards_growth_outside.map((x) => new BN(x)),
        }
    } catch (error) {
        console.error(error)
        throw error
    }
}

// Backwards-compatible naming (used in services)
export const parseCetusSuiDynamicFieldObjectResponse = parseCetusTickDynamicFieldObjectData