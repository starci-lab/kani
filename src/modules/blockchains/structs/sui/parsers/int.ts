import BN from "bn.js"
import {
    SuiObjectI32, SuiObjectI64, SuiObjectI128 
} from "../common"

/**
 * Parses a Sui i32 object into a signed JavaScript number.
 *
 * The `bits` field represents a 32-bit integer stored as an unsigned value.
 * If the highest bit (bit 31) is set, the number is negative and encoded
 * using two’s complement. In that case, subtract 2^32 to recover the
 * signed i32 value.
 */
export const parseSuiI32 = <TypeName extends string = string>(
    {
        fields:     
        { 
            bits
        }
    }: SuiObjectI32<TypeName>
): BN => {
    const bn = new BN(bits)
    // If sign bit (31st bit) is set, interpret as negative (two’s complement)
    if (bn.testn(31)) {
        return bn.sub(new BN(2).pow(new BN(32)))
    }
    // Otherwise, value is a positive i32
    return bn
}

export const serializeSuiI32 = <TypeName extends string = string>(
    value: BN,
    type: TypeName
): SuiObjectI32<TypeName> => {
    const TWO_POW_32 = new BN(2).pow(new BN(32))

    const bits = value.isNeg()
        ? value.add(TWO_POW_32) // two’s complement
        : value

    return {
        type,
        fields: {
            bits: bits.toNumber()
        }
    }
}
/**
 * Parses a Sui i64 object into a signed BN.
 *
 * The `bits` field represents a 64-bit integer stored as an unsigned value.
 * If the highest bit (bit 63) is set, the number is negative and encoded
 * using two's complement. In that case, subtract 2^64 to recover the
 * signed i64 value.
 */
export const parseSuiI64 = <TypeName extends string = string>(
    {
        fields: 
        { 
            bits 
        }
    }: SuiObjectI64<TypeName>
): BN => {
    const bn = new BN(bits)
    // If sign bit (63rd bit) is set, interpret as negative (two's complement)
    if (bn.testn(63)) {
        return bn.sub(new BN(2).pow(new BN(64)))
    }
    // Otherwise, value is a positive i64
    return bn
}

/**
 * Parses a Sui i128 object into a signed decimal string.
 *
 * The `bits` field represents a 128-bit integer stored as an unsigned value.
 * If the highest bit (bit 127) is set, the number is negative and encoded
 * using two’s complement. In that case, subtract 2^128 to recover the
 * signed i128 value.
 */
export const parseSuiI128 = <TypeName extends string = string>(
    {
        fields: 
        { 
            bits 
        }
    }: SuiObjectI128<TypeName>
): BN => {
    const bn = new BN(bits)
    // If sign bit (127th bit) is set, interpret as negative (two’s complement)
    if (bn.testn(127)) {
        return bn.sub(new BN(2).pow(new BN(128)))
    }
    // Otherwise, value is a positive i128
    return bn
}