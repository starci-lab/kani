import { Injectable } from "@nestjs/common"
import crypto from "crypto"
import { MountStorageService } from "@modules/filesystem"

@Injectable()
export class EncryptionService {
    // AES block size for CBC mode (16 bytes = 128 bits)
    private readonly ivLength = 16

    constructor(
        // Service used to securely retrieve the base AES key
        private readonly mountStorageService: MountStorageService,
    ) {}

    /**
     * Derive a 256-bit AES-CBC key using PBKDF2.
     * - Base key is retrieved from the filesystem
     * - Salt comes from environment configuration
     * - PBKDF2 strengthens the key against brute-force attacks
     */
    private getAesKey(): Buffer {
        return this.mountStorageService.aesKey
    }

    /**
     * Encrypt plaintext using AES-256-CBC.
     * - Generates a random IV for each encryption
     * - Returns IV and ciphertext encoded in Base64
     * - Output format: iv:ciphertext
     */
    async encrypt(plainText: string): Promise<string> {
        const key = this.getAesKey()
        // Generate a random Initialization Vector (IV)
        const iv = crypto.randomBytes(this.ivLength)
        // Create AES-CBC cipher
        const cipher = crypto.createCipheriv("aes-256-cbc", key, iv)
        // Encrypt plaintext
        let encrypted = cipher.update(plainText, "utf8", "base64")
        encrypted += cipher.final("base64")
        // Prepend IV so it can be used during decryption
        return iv.toString("base64") + ":" + encrypted
    }

    /**
     * Decrypt AES-256-CBC encrypted data.
     * - Expects input format: iv:ciphertext
     * - Uses the same derived key and extracted IV
     */
    async decrypt(cipherText: string): Promise<string> {
        const key = this.getAesKey()
        // Split IV and encrypted payload
        const [ivBase64, encrypted] = cipherText.split(":")
        // Decode IV from Base64
        const iv = Buffer.from(ivBase64, "base64")
        // Create AES-CBC decipher
        const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv)
        // Decrypt ciphertext
        let decrypted = decipher.update(encrypted, "base64", "utf8")
        decrypted += decipher.final("utf8")
        // Return decrypted plaintext
        return decrypted
    }
}
