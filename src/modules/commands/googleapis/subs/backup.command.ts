import { CommandRunner, SubCommand } from "nest-commander"
import { InjectPrimaryMongoose } from "@modules/databases"
import { Connection } from "mongoose"
import { ExecaService } from "@modules/execa"
import path from "path"
import { GoogleDriveService } from "@modules/googleapis"
import fs from "fs/promises"
import { envConfig } from "@modules/env"
import { DayjsService } from "@modules/mixin"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { MountStorageService } from "@modules/filesystem"
import { Readable } from "stream"

@SubCommand({ name: "backup", description: "Backup MongoDB and upload to Google Drive" })
export class BackupCommand extends CommandRunner {
    constructor(
    @InjectPrimaryMongoose()
    private readonly connection: Connection,
    private readonly execaService: ExecaService,
    private readonly googleDriveService: GoogleDriveService,
    private readonly dayjsService: DayjsService,
    private readonly mountStorageService: MountStorageService,
    @InjectWinston()
    private readonly logger: WinstonLogger,
    ) {
        super()
    }

    async run(): Promise<void> {
        const { databases, mountPath } = envConfig()

        const host = this.connection.host
        const port = this.connection.port
        const dbName = this.connection.name

        const mongoUri = `mongodb://${databases.mongoose.primary.username}:${databases.mongoose.primary.password}@${host}:${port}/${dbName}?authSource=admin`

        const backupedAt = this.dayjsService.now().format("YYYY-MM-DD_HH-mm-ss")

        const dumpDirName = `kani-mongo-dump-${backupedAt}`
        const archiveName = `kani-${backupedAt}.7z`

        const backupRoot = mountPath.googleapis.googleDrive
        const dumpDirPath = path.join(backupRoot, dumpDirName)
        const archivePath = path.join(backupRoot, archiveName)
        // the aes password is the same as the one used to encrypt the database
        const aesPassword = this.mountStorageService.aesKey
        // ================================
        // MongoDB dump
        // ================================
        await this.execaService.exec(
            "mongodump", 
            [
                `--uri=${mongoUri}`,
                `--out=${dumpDirPath}`,
                "--gzip",
                "--quiet",
            ]
        )
        this.logger.info(WinstonLog.MongoDumpCompleted, { dumpDirName })
        // ================================
        // 7z compress + encrypt
        // ================================
        await this.execaService.exec(
            "7z",
            [
                "a",
                archivePath,
                dumpDirPath,
                "-mx=9",
                "-mmt=on",
                "-mhe=on",
                `-p${aesPassword}`,
            ]
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
    }
}
