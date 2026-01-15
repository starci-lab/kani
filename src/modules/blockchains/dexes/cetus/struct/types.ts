/** ========== COMMON TYPES ========== */

// Object ID wrapper
export interface SuiObjectID {
    id: string;
}

// I32 wrapper used by Cetus
export interface SuiObjectI32 {
    type: string;
    fields: {
        bits: number;
    };
}

// I128 wrapper used by Cetus
export interface SuiObjectI128 {
    type: string;
    fields: {
        /** Move i128 serialized as string bits */
        bits: string;
    };
}

// option_u64::OptionU64 used by Cetus skip list
export interface SuiObjectOptionU64 {
    type: string;
    fields: {
        is_none: boolean;
        v: string;
    };
}

/** Generic Move object content wrapper (Sui RPC) */
export interface SuiMoveObjectContent<TFields> {
    dataType: "moveObject";
    type: string;
    hasPublicTransfer: boolean;
    fields: TFields;
}

/** Generic Sui RPC object data wrapper */
export interface SuiObjectData<TFields> {
    objectId: string;
    version: string;
    digest: string;
    type: string;
    owner: {
        ObjectOwner: string;
    };
    previousTransaction: string;
    storageRebate: string;
    content: SuiMoveObjectContent<TFields>;
}

/** Generic Sui RPC object response wrapper */
export interface SuiObjectResponse<TFields> {
    data: SuiObjectData<TFields>;
}

/** Cetus code often uses dynamic fields; these aliases keep naming consistent in the module */
export type CetusSuiDynamicFieldObjectResponse<TFields> = SuiObjectResponse<TFields>;
export type CetusSuiDynamicFieldObjectData<TFields> = SuiObjectData<TFields>;

/** Generic Cetus skip_list::Node<T> wrapper */
export interface CetusSuiSkipListNode<TValue> {
    type: string;
    fields: {
        nexts: Array<SuiObjectOptionU64>;
        prev: SuiObjectOptionU64;
        score: string;
        value: TValue;
    };
}

// Common TypeName structure
export interface TypeName {
    fields: {
        name: string;
    };
    type: "0x1::type_name::TypeName";
}

