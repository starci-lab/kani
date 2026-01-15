import BN from "bn.js"
import { 
    parseSuiI128, 
    parseSuiI32, 
    SuiObject, 
    SuiObjectI128, 
    SuiObjectI32 
} from "../../../structs"

// cetus tick object fields
export interface CetusSuiObjectTickFields {
    fee_growth_outside_a: string
    fee_growth_outside_b: string
    index: SuiObjectI32<`${string}::i32::I32`>
    liquidity_gross: string
    liquidity_net: SuiObjectI128<`${string}::i128::I128`>
    points_growth_outside: string
    rewards_growth_outside: Array<string>
    sqrt_price: string
}
// cetus tick object type
export type CetusSuiObjectTick = SuiObject<CetusSuiObjectTickFields, `${string}::tick::Tick`>;
// cetus tick interface
export interface CetusTick {
    feeGrowthOutsideA: BN
    feeGrowthOutsideB: BN
    index: BN
    liquidityGross: BN
    liquidityNet: BN
    pointsGrowthOutside: BN
    rewardsGrowthOutside: Array<BN>
    sqrtPrice: BN
}
// parse cetus tick object to cetus tick interface
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