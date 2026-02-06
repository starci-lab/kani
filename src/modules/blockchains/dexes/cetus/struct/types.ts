import {
    SuiMoveObjectContentFields, SuiObject, SuiObjectOptionU64 
} from "../../../structs"

/**
 * Fields structure for Cetus skip list node Sui object.
 * Represents a node in a skip list data structure used for tick management.
 *
 * @template Value - The value type stored in the skip list node
 * @template TypeName - The Sui object type name
 */
export interface CetusSuiSkipListNodeFields<Value, TypeName extends string = string> {
    /** Array of next node references (option u64). */
    nexts: Array<SuiObjectOptionU64<`${string}::option_u64::OptionU64`>>
    /** Previous node reference (option u64). */
    prev: SuiObjectOptionU64<`${string}::option_u64::OptionU64`>
    /** Score value for ordering. */
    score: string
    /** Fields of the Sui object value. */
    fields: SuiMoveObjectContentFields<SuiObject<Value, TypeName>>
}