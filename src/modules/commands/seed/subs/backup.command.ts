
import { CommandRunner, SubCommand } from "nest-commander"
import { InjectPrimaryMongoose } from "@modules/databases"
import { Connection } from "mongoose"
import { ExecaService } from "@modules/execa"
import path from "path"
import { GoogleDriveService } from "@modules/googleapis"
import fs from "fs/promises"
import { Readable } from "stream"
import { envConfig } from "@modules/env"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { DayjsService } from "@modules/mixin"
import { EncryptionService } from "@modules/crypto"

@SubCommand({ name: "backup", description: "Backup the database" })
export class BackupCommand extends CommandRunner {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly execaService: ExecaService,
        private readonly googleDriveService: GoogleDriveService,
        private readonly dayjsService: DayjsService,
        private readonly encryptionService: EncryptionService,
        @InjectWinston()
        private readonly logger: WinstonLogger
    ) {
        super()
    }

    async run(): Promise<void> {
        // get the url of the database
        const host = this.connection.host
        const port = this.connection.port
        const dbName = this.connection.name
        const uri = `mongodb://${envConfig().databases.mongoose.primary.username}:${envConfig().databases.mongoose.primary.password}@${host}:${port}/?authSource=admin&readPreference=primary`
        // get the backup folder name
        const backupedAt = this.dayjsService.now().format("YYYY-MM-DD-HH-mm-ss")
        const backupFolderNamePreEncrypted = `kani-pre-encrypted-${backupedAt}`
        const backupFolderName = `kani-${backupedAt}`
        const backupDir = envConfig().mountPath.googleapis.googleDrive
        const backupFolderPath = path.join(backupDir, backupFolderName) 
        const backupFolderPathPreEncrypted = path.join(backupDir, backupFolderNamePreEncrypted)
        const aesKey = await this.encryptionService.encrypt(backupFolderName)
        await this.execaService.exec(
            "mongodump", [
                `--uri="${uri}"`,
                `--out="${backupFolderPathPreEncrypted}"`,
                `--db="${dbName}"`,
                "--gzip",
                "--quiet"
            ])
        await this.execaService.exec("openssl", [
            "enc",
            "-aes-256-gcm",
            "-salt",
            "-pbkdf2",
            "-pass",
            `pass:${aesKey}`,
            "-in",
            backupFolderPathPreEncrypted,
            "-out",
            backupFolderPath,
        ])
        await fs.rm(backupFolderPathPreEncrypted, { recursive: true })
        // read all files in the backup folder
        const dataBaseBackupFolderPath = path.join(backupFolderPath, dbName)
        const files = await fs.readdir(dataBaseBackupFolderPath)
        // map files to full paths
        const backupFilePaths = files.map((file) => path.join(dataBaseBackupFolderPath, file))
        // prepare files for upload in the expected format (like Multer files)
        const backupFiles = await Promise.all(
            backupFilePaths.map(async (filePath): Promise<Express.Multer.File> => {
                const fileBuffer = await fs.readFile(filePath)
                const fileName = path.basename(filePath)
                return {
                    buffer: fileBuffer,
                    originalname: fileName,
                    fieldname: fileName,
                    size: fileBuffer.length,
                    stream: Readable.from(fileBuffer),
                    destination: backupFolderPath,
                    filename: fileName,
                    path: filePath,
                    mimetype: "application/octet-stream",
                    encoding: "binary",
                }
            })
        )
        // upload folder with files
        await this.googleDriveService.uploadFolder({
            folderName: backupFolderName,
            files: backupFiles,
        })
        // delete the backup folder
        await fs.rm(backupFolderPath, { recursive: true })
        this.logger.info(
            WinstonLog.BackupCompleted, { 
                backupFolderName: backupFolderName,
                backupedAt
            }
        )
    }
}
