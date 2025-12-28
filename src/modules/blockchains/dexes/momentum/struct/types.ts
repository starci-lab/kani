/** ========== COMMON TYPES ========== */

// Object ID wrapper
export interface SuiObjectID {
    id: string
}

// I32 wrapper
export interface SuiObjectI32 {
    type: string
    fields: {
        bits: number
    }
}

// I64 wrapper
export interface SuiObjectI64 {
    type: string
    fields: {
        bits: string
    }
}

// Common TypeName structure
export interface TypeName {
    type: string
    fields: {
        name: string
    }
}

