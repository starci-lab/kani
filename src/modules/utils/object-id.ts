import { createHash } from "crypto"
import { Types } from "mongoose"

export const createObjectId = (input: string): Types.ObjectId => {
    const hash = createHash("sha256")
        .update(input)
        .digest("hex")
        .slice(0, 24) // ObjectId = 12 bytes = 24 hex chars
    return new Types.ObjectId(hash)
}
