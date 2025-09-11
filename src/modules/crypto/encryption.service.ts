import { envConfig } from "@modules/env"
import { Injectable } from "@nestjs/common"
import crypto from "crypto"

@Injectable()
export class EncryptionService {
    private readonly aesCbcKey = envConfig().cryptography.aesCbcKey
    private readonly ivLength = 16 // AES block size

    constructor() { }

    // Encrypt AES-CBC
    encrypt(
        plainText: string
    ): string {
        const iv = crypto.randomBytes(this.ivLength)
        const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(this.aesCbcKey), iv)
        let encrypted = cipher.update(plainText, "utf8", "base64")
        encrypted += cipher.final("base64")
        return iv.toString("base64") + ":" + encrypted
    }

    // Decrypt AES-CBC
    decrypt(
        cipherText: string
    ): string {
        const [ivBase64, encrypted] = cipherText.split(":")
        const iv = Buffer.from(ivBase64, "base64")
        const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(this.aesCbcKey), iv)
        let decrypted = decipher.update(encrypted, "base64", "utf8")
        decrypted += decipher.final("utf8")
        return decrypted
    }
}