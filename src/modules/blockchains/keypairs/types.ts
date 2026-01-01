import { EncryptedPayload } from "@typedefs"

export interface GeneratedKeypair {
    accountAddress: string
    encryptedPrivateKeyPayload: EncryptedPayload
}