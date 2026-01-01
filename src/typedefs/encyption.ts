export interface EncryptedPayload {
    iv: string
    ciphertext: string
    authTag: string
}