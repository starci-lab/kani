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

// Common TypeName structure
export interface TypeName {
    fields: {
        name: string;
    };
    type: "0x1::type_name::TypeName";
}

