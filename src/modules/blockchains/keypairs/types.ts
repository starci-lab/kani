import {
    EncryptedPayload 
} from "@modules/typedefs"

export interface GeneratedKeypair {
    accountAddress: string
    encryptedPrivateKeyPayload: EncryptedPayload
}