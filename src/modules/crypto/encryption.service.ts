import {
    Injectable
} from "@nestjs/common"
import crypto from "crypto"
import {
    IV_LENGTH
} from "./constants"
import type {
    DecryptParams,
    DecryptResult,
    EncryptParams,
    EncryptResult
} from "./types"

/**
 * Service for AES-256-GCM encryption and decryption (authenticated encryption).
 *
 * @example
 * const payload = encryptionService.encrypt({ plainText, key })
 * const text = encryptionService.decrypt({ payload, key })
 */
@Injectable()
export class EncryptionService {
    constructor() {}

    /**
     * Encrypts plaintext using AES-256-GCM (random IV per call, auth tag for integrity).
     *
     * @param param - Plaintext and key (Buffer)
     * @returns Encrypted payload (iv, ciphertext, authTag as Base64)
     *
     * @example
     * const payload = encryptionService.encrypt({ plainText: "secret", key })
     */
    encrypt({
        plainText,
        key,
    }: EncryptParams): EncryptResult {
        const iv = crypto.randomBytes(IV_LENGTH)

        const cipher = crypto.createCipheriv("aes-256-gcm",
            key,
            iv)

        const encrypted = Buffer.concat([
            cipher.update(plainText,
                "utf8"),
            cipher.final(),
        ])
        const authTag = cipher.getAuthTag()

        return {
            iv: iv.toString("base64"),
            authTag: authTag.toString("base64"),
            ciphertext: encrypted.toString("base64"),
        }
    }

    /**
     * Decrypts AES-256-GCM payload; verifies integrity via auth tag (throws if tampered).
     *
     * @param param - Payload (iv, authTag, ciphertext) and key
     * @returns Decrypted plaintext
     *
     * @example
     * const text = encryptionService.decrypt({ payload, key })
     */
    decrypt({
        payload,
        key,
    }: DecryptParams): DecryptResult {
        const { iv, authTag, ciphertext } = payload

        try {
            const ivBuffer = Buffer.from(iv,
                "base64")
            const authTagBuffer = Buffer.from(authTag,
                "base64")
            const encryptedBuffer = Buffer.from(ciphertext,
                "base64")

            if (ivBuffer.length !== IV_LENGTH) {
                throw new Error("Invalid IV length")
            }

            const decipher = crypto.createDecipheriv("aes-256-gcm",
                key,
                ivBuffer)
            decipher.setAuthTag(authTagBuffer)

            const decryptedBuffer = Buffer.concat([
                decipher.update(encryptedBuffer),
                decipher.final(),
            ])
            return decryptedBuffer.toString("utf8")
        } catch (error) {
            console.error("Error decrypting data",
                error)
            throw new Error("Failed to decrypt data")
        }
    }
}
