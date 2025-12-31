import { CommandRunner, SubCommand, Option } from "nest-commander"
import { InjectPrimaryMongoose } from "@modules/databases"
import { Connection } from "mongoose"
import { ExecaService } from "@modules/execa"
import path from "path"
import fs from "fs/promises"
import { envConfig } from "@modules/env"
import { DayjsService } from "@modules/mixin"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { MountStorageService } from "@modules/filesystem"
import { GoogleDriveService } from "@modules/googleapis"

@SubCommand({
    name: "restore",
    description: "Restore MongoDB from Google Drive backup",
})
export class RestoreCommand extends CommandRunner {
    private fileId!: string
  
    constructor(
      @InjectPrimaryMongoose()
      private readonly connection: Connection,
      private readonly execaService: ExecaService,
      private readonly dayjsService: DayjsService,
      private readonly mountStorageService: MountStorageService,
      private readonly googleDriveService: GoogleDriveService,
      @InjectWinston()
      private readonly logger: WinstonLogger,
    ) {
        super()
    }
  
    @Option({
        flags: "-f, --fileId <fileId>",
        description: "Google Drive file ID (.7z backup)",
        required: true,
    })
    parseFileId(fileId: string): string {
        return fileId
    }
  
    async run(): Promise<void> {
        try {
            const { databases, mountPath } = envConfig()
  
            const mongoUri = `mongodb://${databases.mongoose.primary.username}:${databases.mongoose.primary.password}@${this.connection.host}:${this.connection.port}/${this.connection.name}?authSource=admin`

            const restoreAt = this.dayjsService.now().format("YYYY-MM-DD_HH-mm-ss")

            const restoreRoot = mountPath.googleapis.googleDrive
            const archiveName = `restore-${restoreAt}.7z`
            const archivePath = path.join(restoreRoot, archiveName)
            const extractDir = path.join(restoreRoot, `restore-${restoreAt}`)
  
            const aesPassword = this.mountStorageService.aesKey
  
            // ================================
            // Download from Google Drive
            // ================================
            await this.googleDriveService.downloadFile(this.fileId, archivePath)
            this.logger.info(WinstonLog.GoogleDriveFileDownloaded, { fileId: this.fileId, archiveName })
            // ================================
            // Extract + decrypt
            // ================================
            await this.execaService.exec("7z", [
                "x",
                archivePath,
                `-o${extractDir}`,
                `-p${aesPassword}`,
                "-y",
            ])
            this.logger.info(WinstonLog.SevenZExtractionCompleted, { archiveName })
            // ================================
            // MongoDB restore
            // ================================
            await this.execaService.exec("mongorestore", [
                `--uri=${mongoUri}`,
                extractDir,
                "--gzip",
                "--drop",
                "--quiet",
            ])
            this.logger.info(WinstonLog.MongoDBRestoreCompleted, { dbName: this.connection.name, fileId: this.fileId })
            // ================================
            // Cleanup
            // ================================
            await fs.rm(extractDir, { recursive: true, force: true })
            await fs.rm(archivePath, { force: true })
  
            this.logger.info(WinstonLog.RestoreCompleted, { archiveName, fileId: this.fileId })
            // exit the app
            process.exit(0)
        } catch (error) {
            this.logger.error(WinstonLog.RestoreFailed, { error: error.message })
            process.exit(1)
        }
    }
}
  