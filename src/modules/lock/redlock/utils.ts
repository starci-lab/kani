import { createHash } from "crypto"

export enum RedlockKey {
    Action = "action",
}
export const getRedlockKey = (key: RedlockKey, ...args: Array<unknown>): string => {
    const hash = createHash("sha256")
        .update(JSON.stringify(args))
        .digest("hex")
    return `${key}-${hash}`
}