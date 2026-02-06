/** Params for KMS encrypt. */
export interface EncryptParams {
    plaintext: string
}

/** Result of KMS encrypt (ciphertext buffer). */
export type EncryptResult = Buffer

/** Params for KMS decrypt. */
export interface DecryptParams {
    ciphertext: Buffer
}

/** Result of KMS decrypt (plaintext string). */
export type DecryptResult = string
