import BN from "bn.js"

export const ZERO_BN = new BN(0)
export const MAX_UINT_64 = new BN(1).shln(64).subn(1)