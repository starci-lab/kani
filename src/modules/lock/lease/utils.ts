import { createHash } from "crypto"

export enum LeaseKey {
    Action = "action",
}
export const getLeaseKey = (
    key: LeaseKey, 
    ...args: Array<unknown>
): string => {
    const hash = createHash("sha256")
        .update(JSON.stringify(args))
        .digest("hex")
    return `${key}-${hash}`
}