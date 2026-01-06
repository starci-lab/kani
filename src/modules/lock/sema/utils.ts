import { createHash } from "crypto"

export enum SemaKey {
    Action = "action",
}
export const getSemaKey = (key: SemaKey, ...args: Array<unknown>): string => {
    const hash = createHash("sha256")
        .update(JSON.stringify(args))
        .digest("hex")
    return `${key}-${hash}`
}