import { createHash } from "crypto"

export enum AtomicLockKey {
    Action = "action",
}
export const getAtomicLockKey = (
    key: AtomicLockKey, 
    ...args: Array<unknown>
): string => {
    const hash = createHash("sha256")
        .update(JSON.stringify(args))
        .digest("hex")
    return `${key}-${hash}`
}