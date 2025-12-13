import { Injectable } from "@nestjs/common"
import crypto from "crypto"
import fs from "fs"
import { join } from "path"
import { envConfig } from "@modules/env"

@Injectable()
export class EncryptionService {
    private readonly ivLength = 16 // AES block size
    constructor() {}
    // Get AES-CBC key
    private getAesCbcKey(): string {
        const aseKeyPath = join(process.cwd(), ".mount", "keys", "aes.key")
        const keyRaw = fs.readFileSync(aseKeyPath, "utf8")
        const keyBuffer = crypto.pbkdf2Sync(
            keyRaw,                 // base key
            envConfig().salt.aesCbc,// salt
            100_000,                // number of hash rounds
            32,                     // length of key (bytes)
            "sha256"                // hash function
        )
        const aesCbcKey = keyBuffer.toString("hex")
        return aesCbcKey
    }
    // Encrypt AES-CBC
    encrypt(
        plainText: string
    ): string {
        const iv = crypto.randomBytes(this.ivLength)
        const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(this.getAesCbcKey()), iv)
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
        const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(this.getAesCbcKey()), iv)
        let decrypted = decipher.update(encrypted, "base64", "utf8")
        decrypted += decipher.final("utf8")
        return decrypted
    }
}