import { Injectable } from "@nestjs/common"
import crypto from "crypto"
import { EncryptedPayload } from "@typedefs"

@Injectable()
export class EncryptionService {
    // Recommended IV length for AES-GCM (12 bytes)
    private readonly ivLength = 12

    constructor() {}


    /**
     * Encrypt plaintext using AES-256-GCM.
     *
     * - Generates a random IV per encryption
     * - Provides authenticated encryption (confidentiality + integrity)
     * - Output format (Base64 encoded):
     *   iv:authTag:ciphertext
     */
    encrypt(plainText: string, key: Buffer<ArrayBufferLike>): EncryptedPayload {
        // Generate a random IV
        const iv = crypto.randomBytes(this.ivLength)
        // Create AES-GCM cipher
        const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
        // Encrypt data
        const encrypted = Buffer.concat(
            [
                cipher.update(plainText, "utf8"),
                cipher.final(),
            ]
        )
        // Authentication tag (integrity + authenticity)
        const authTag = cipher.getAuthTag()
        // Return IV, auth tag, and ciphertext
        return {
            iv: iv.toString("base64"),
            authTag: authTag.toString("base64"),
            ciphertext: encrypted.toString("base64"),
        }
    }

    /**
     * Decrypt AES-256-GCM encrypted data.
     *
     * - Expects input format: iv:authTag:ciphertext
     * - Automatically verifies integrity via auth tag
     * - Throws if data was tampered with
     */
    decrypt(
        { iv, authTag, ciphertext }: EncryptedPayload, 
        key: Buffer<ArrayBufferLike>
    ): string {
        const ivBuffer = Buffer.from(iv, "base64")
        const authTagBuffer = Buffer.from(authTag, "base64")
        const encryptedBuffer = Buffer.from(ciphertext, "base64")

        if (ivBuffer.length !== this.ivLength) {
            throw new Error("Invalid IV length")
        }
        // Create AES-GCM decipher
        const decipher = crypto.createDecipheriv("aes-256-gcm", key, ivBuffer)
        decipher.setAuthTag(authTagBuffer)
        // Decrypt and verify integrity
        const decryptedBuffer = Buffer.concat([
            decipher.update(encryptedBuffer),
            decipher.final(), // throws if auth tag is invalid
        ])
        return decryptedBuffer.toString("utf8")
    }
}
