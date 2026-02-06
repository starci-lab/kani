import type {
    EncryptedPayload 
} from "@modules/crypto"

/** Params for encrypt (plaintext string). */
export interface DerivedEncryptParams {
    data: string
}

/** Result of derived encrypt (encrypted payload). */
export type DerivedEncryptResult = EncryptedPayload

/** Params for decrypt (encrypted payload). */
export interface DerivedDecryptParams {
    payload: EncryptedPayload
}

/** Result of derived decrypt (plaintext string). */
export type DerivedDecryptResult = string
