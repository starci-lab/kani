import { envConfig } from "@modules/env/config"
import { Injectable } from "@nestjs/common"
import { promises as fs } from "fs"

/**
 * Service responsible for reading secrets mounted into the container filesystem.
 *
 * Purpose:
 * - Avoid using process.env for sensitive secrets (prevents leaks via logs, APMs, or third-party libraries)
 * - Secrets are mounted as Kubernetes Secret volumes
 * - Secrets are accessed explicitly and on demand via the filesystem
 *
 * This follows best practices for Node.js applications running on Kubernetes.
 */
@Injectable()
export class MountFilesystemService {
    /**
     * Reads the EdDSA (Ed25519) private key from the filesystem.
     * - Used for cryptographic signing and verification
     * - Key is mounted as a read-only Kubernetes Secret volume
     */
    async cryptoKeyEdSa(): Promise<string> {
        return await fs.readFile(
            envConfig().mountPath.gcp.cryptoKeyEdSa,
            "utf8"
        )
    }

    async aes(): Promise<string> {
        return await fs.readFile(
            envConfig().mountPath.keys.aes,
            "utf8"
        )
    }

    async jwtSecret(): Promise<string> {
        return await fs.readFile(
            envConfig().mountPath.keys.jwtSecret,
            "utf8"
        )
    }

    async smtpConfig(): Promise<SmtpConfig> {
        const config = await fs.readFile(
            envConfig().mountPath.apiKeys.smtp,
            "utf8"
        )
        return JSON.parse(config) as SmtpConfig
    }
}

export interface SmtpConfig {
    host: string
    port: number
    user: string
    key: string
    from: string
}