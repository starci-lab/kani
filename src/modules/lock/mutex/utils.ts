import { createHash } from "crypto"

export enum MutexKey {
    Action = "action",
}
export const getMutexKey = (key: MutexKey, ...args: Array<unknown>): string => {
    const hash = createHash("sha256")
        .update(JSON.stringify(args))
        .digest("hex")
    return `${key}-${hash}`
}