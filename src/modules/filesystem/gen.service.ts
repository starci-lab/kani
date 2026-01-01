import { writeFileSync, mkdirSync } from "fs"
import path from "path"
import { envConfig } from "@modules/env"
import { Injectable } from "@nestjs/common"

@Injectable()
export class GenFilesystemService {
    async writeEncryptedKey(
        encryptedKeyName: string,
        encryptedData: Buffer<ArrayBufferLike>
    ): Promise<void> {
        const dirPath = envConfig().genPath.keys
        const filePath = path.join(dirPath, `${encryptedKeyName}.key`)
        mkdirSync(dirPath, { recursive: true })
        writeFileSync(
            filePath,
            encryptedData.toString("base64"),
        )
    }
}