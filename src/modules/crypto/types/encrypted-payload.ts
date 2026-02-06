/** AES-GCM encrypted payload (iv, ciphertext, authTag as Base64 strings). */
export interface EncryptedPayload {
    iv: string
    ciphertext: string
    authTag: string
}
