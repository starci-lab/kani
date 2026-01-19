import {
    createHash as createHashCrypto 
} from "crypto"
// create a hash of the input arguments
export const createHash = (...args: Array<unknown>): string => {
    const raw = args.map((a) =>
        typeof a === "object" ? JSON.stringify(a) : String(a)
    ).join(":")
    return createHashCrypto("sha256")
        .update(raw)
        .digest("hex")
}