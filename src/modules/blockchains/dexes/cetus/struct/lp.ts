import { SuiObjectI32, SuiObjectID, TypeName } from "./types"

// Main Cetus Liquidity Position interface
export interface CetusLiquidityPosition {
    coin_type_a: TypeName;
    coin_type_b: TypeName;

    description: string;

    id: SuiObjectID;

    index: string; // thường là string dù mang nghĩa number
    liquidity: string; // u128 → string

    name: string;

    pool: string; // pool object id

    tick_lower_index: SuiObjectI32;
    tick_upper_index: SuiObjectI32;

    url: string;
}
