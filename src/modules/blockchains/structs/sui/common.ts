/** ========== COMMON TYPES ========== */

// Object ID wrapper
export interface SuiObjectID {
    id: string;
}

export interface SuiObject<
    Fields,
    TypeName extends string = string,
> {
    type: TypeName;
    fields: Fields;
}
// I32 wrapper used by Cetus
export interface SuiObjectI32Fields {
    bits: number;
}
export type SuiObjectI32<TypeName extends string = string> = SuiObject<SuiObjectI32Fields, TypeName>;

// I64 wrapper used by Momentum
export interface SuiObjectI64Fields {
    bits: string;
}
export type SuiObjectI64<TypeName extends string = string> = SuiObject<SuiObjectI64Fields, TypeName>;

// I128 wrapper used by Cetus
export interface SuiObjectI128Fields {
    bits: string;
}
export type SuiObjectI128<TypeName extends string = string> = SuiObject<SuiObjectI128Fields, TypeName>;

// option_u64::OptionU64 used by Cetus skip list
export interface SuiObjectOptionU64Fields {
    is_none: boolean;
    v: string;
}
export type SuiObjectOptionU64<TypeName extends string = string> = SuiObject<SuiObjectOptionU64Fields, TypeName>;

export interface SuiMoveObjectContentFields<Value> {
    name: string;
    value: Value;
    id: SuiObjectID;
}
export interface SuiMoveObjectContent<Fields, TypeName extends string = string> {
    dataType: "moveObject";
    type: TypeName;
    hasPublicTransfer: boolean;
    fields: SuiMoveObjectContentFields<Fields>;
}

/** Generic Sui RPC object data wrapper */
export interface SuiMoveObjectData<Fields> {
    objectId: string;
    version: string;
    digest: string;
    type: string;
    owner: {
        ObjectOwner: string;
    };
    previousTransaction: string;
    storageRebate: string;
    content: SuiMoveObjectContent<Fields>;
}

/** Generic Sui RPC object response wrapper */
export interface SuiObjectResponse<Fields> {
    data: SuiMoveObjectData<Fields>;
}

// Common TypeName structure
export type TypeName = SuiObject<{
    name: string;
}, "0x1::type_name::TypeName">;

// Table structure used by FlowX and other DEXes
export interface SuiObjectTableFields {
    id: SuiObjectID;
    size: string;
}

export type SuiObjectTable<KeyType extends string = string, ValueType extends string = string> = SuiObject<
    SuiObjectTableFields,
    `${string}::table::Table<${KeyType}, ${ValueType}>`
>;

