import { CommandRunner, SubCommand } from "nest-commander"
import { ExecaService } from "@modules/execa"
import path from "path"
import { GoogleDriveService, GoogleDriveFolderId } from "@modules/gcp"
import fs from "fs/promises"
import { envConfig } from "@modules/env"
import { DayjsService } from "@modules/mixin"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { Readable } from "stream"
import { DerivedAesKeyService } from "@modules/derived"
import { Option } from "nest-commander"

@SubCommand({ name: "backup", description: "Backup MongoDB and upload to Google Drive" })
export class BackupCommand extends CommandRunner {
    constructor(
    private readonly execaService: ExecaService,
    private readonly googleDriveService: GoogleDriveService,
    private readonly dayjsService: DayjsService,
    private readonly derivedAesKeyService: DerivedAesKeyService,
    @InjectWinston()
    private readonly logger: WinstonLogger,
    ) {
        super()
    }

    @Option({
        flags: "-w, --without-password",
        description: "Disable AES encryption for the backup archive",
    })
    parseWithoutPassword(): boolean {
        return true
    }

    async run(_: Array<string>, options: BackupCommandOptions): Promise<void> {
        const { withoutPassword } = options
        try {
            const { databases, mountPath } = envConfig()

            const username = databases.mongoose.primary.username
            const password = databases.mongoose.primary.password
            const dbName = databases.mongoose.primary.dbName
            const host = databases.mongoose.primary.host
            const port = databases.mongoose.primary.port

            const mongoUri = `mongodb://${username}:${password}@${host}:${port}/?authSource=admin&readPreference=primary`

            const backupedAt = this.dayjsService.now().format("YYYY-MM-DD_HH-mm-ss")

            const dumpDirName = `kani-mongo-dump-${backupedAt}`
            const archiveName = `kani-${backupedAt}.7z`
            const backupRoot = mountPath.data.backup
            const dumpDirPath = path.join(backupRoot, dumpDirName)
            const archivePath = path.join(backupRoot, archiveName)
            // the aes password is the same as the one used to encrypt the database
            const aesPassword = this.derivedAesKeyService.key
            // ================================
            // MongoDB dump
            // ================================
            const mongodumpArgs: Array<string> = [
                `--uri=${mongoUri}`,
                `--out=${dumpDirPath}`,
                `--db=${dbName}`,
                "--gzip",
                "--quiet",
            ]
            await this.execaService.exec(
                "mongodump", 
                mongodumpArgs
            )
            this.logger.info(WinstonLog.MongoDumpCompleted, { dumpDirName })
            // ================================
            // 7z compress + encrypt
            // ================================
            const sevenZArgs: Array<string> = [
                "a",
                archivePath,
                dumpDirPath,
                "-mx=9",
                "-mmt=on",
                "-mhe=on",
            ]
            if (!withoutPassword) {
                sevenZArgs.push(`-p${aesPassword}`)
            }
            sevenZArgs.push("-y")
            await this.execaService.exec(
                "7z",
                sevenZArgs
            )
            this.logger.info(WinstonLog.SevenZCompressionCompleted, { archiveName })
            // ================================
            // Cleanup plaintext dump
            // ================================
            await fs.rm(dumpDirPath, { recursive: true, force: true })
            // ================================
            // Upload to Google Drive
            // ================================
            // prepare file for upload in the expected format (like Multer files)
            const fileBuffer = await fs.readFile(archivePath)
            const fileName = path.basename(archivePath)
            const file: Express.Multer.File = {
                buffer: fileBuffer,
                originalname: fileName,
                fieldname: fileName,
                size: fileBuffer.length,
                stream: Readable.from(fileBuffer),
                destination: backupRoot,
                filename: fileName,
                path: archivePath,
                mimetype: "application/octet-stream",
                encoding: "binary",
            }
            // upload file to Google Drive
            await this.googleDriveService.uploadFiles({
                files: [file],
                folderEnum: GoogleDriveFolderId.Db,
            })
            this.logger.info(WinstonLog.GoogleDriveFileUploaded, { archiveName })
            // ================================
            // Cleanup encrypted archive
            // ================================
            await fs.rm(archivePath, { force: true })
            // log the backup completed
            this.logger.info(WinstonLog.BackupCompleted, { archiveName })
            // exit the app
            process.exit(0)
        } catch (error) {
            this.logger.error(WinstonLog.BackupFailed, { error: error.message })
            process.exit(1)
        }
    }
}

interface BackupCommandOptions {
    withoutPassword?: boolean
}