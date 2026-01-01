import { EncryptedPayload } from "@typedefs"

export interface Sealed {
    getSealedKey(): Promise<Buffer<ArrayBufferLike>>
    encrypt(data: string): Promise<EncryptedPayload>
    decrypt(payload: EncryptedPayload): Promise<string>
}