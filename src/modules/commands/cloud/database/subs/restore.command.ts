import { CommandRunner, SubCommand, Option } from "nest-commander"
import { InjectPrimaryMongoose } from "@modules/databases"
import { Connection } from "mongoose"
import { ExecaService } from "@modules/execa"
import path from "path"
import { envConfig } from "@modules/env"
import { DayjsService } from "@modules/mixin"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { GoogleDriveService } from "@modules/gcp"
import { DerivedAesKeyService } from "@modules/derived"
import fs from "fs/promises"

@SubCommand({
    name: "restore",
    description: "Restore the database from Google Drive backup",
})
export class RestoreCommand extends CommandRunner {   
    constructor(
      @InjectPrimaryMongoose()
      private readonly connection: Connection,
      private readonly execaService: ExecaService,
      private readonly dayjsService: DayjsService,
      private readonly googleDriveService: GoogleDriveService,
      private readonly derivedAesKeyService: DerivedAesKeyService,
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

    @Option({
        flags: "-w, --without-password",
        description: "Disable AES encryption for the backup archive",
    })
    parseWithoutPassword(): boolean {
        return true
    }
  
    async run(
        _: Array<string>, 
        options: RestoreCommandOptions
    ): Promise<void> {
        const { fileId, withoutPassword } = options
        try {
            const { databases, mountPath } = envConfig()
            
            const username = databases.mongoose.primary.username
            const password = databases.mongoose.primary.password
            const host = databases.mongoose.primary.host
            const port = databases.mongoose.primary.port
            const dbName = databases.mongoose.primary.dbName
            const mongoUri = `mongodb://${username}:${password}@${host}:${port}/?authSource=admin&readPreference=primary`
            const restoreAt = this.dayjsService.now().format("YYYY-MM-DD_HH-mm-ss")

            const restoreRoot = mountPath.googleapis.googleDrive
            const archiveName = `restore-${restoreAt}.7z`
            const archivePath = path.join(restoreRoot, archiveName)
            // delete the archive if it exists
            if (await fs.stat(archivePath).then(() => true).catch(() => false)) {
                await fs.rm(archivePath, { force: true })
            }
            const extractDir = path.join(restoreRoot, `restore-${restoreAt}`)
            const aesPassword = this.derivedAesKeyService.key
  
            // ================================
            // Download from Google Drive
            // ================================
            await this.googleDriveService.downloadFile(fileId, archivePath)
            this.logger.info(WinstonLog.GoogleDriveFileDownloaded, { fileId, archiveName })
            // ================================
            // Extract + decrypt
            // ================================
            const sevenZArgs: Array<string> = [
                "x",
                archivePath,
                `-o${extractDir}`,
            ]
            if (!withoutPassword) {
                sevenZArgs.push(`-p${aesPassword}`)
            }
            sevenZArgs.push("-y")
            await this.execaService.exec(
                "7z", sevenZArgs
            )
            this.logger.info(WinstonLog.SevenZExtractionCompleted, { archiveName })
            // ================================
            // MongoDB restore
            // ================================
            const [dumpRootDir] = await fs.readdir(extractDir)
            const dumpRootPath = path.join(extractDir, dumpRootDir)
            const mongorestoreArgs: Array<string> = [
                `--uri=${mongoUri}`,
                `--dir=${dumpRootPath}`,
                `--nsInclude=${dbName}.*`,
                "--gzip",
                "--drop",
                "--quiet"
            ]
            await this.execaService.exec(
                "mongorestore", mongorestoreArgs
            )
            this.logger.info(WinstonLog.MongoDBRestoreCompleted, { dbName: this.connection.name, fileId })
            // ================================
            // Cleanup
            // ================================
            await fs.rm(extractDir, { recursive: true, force: true })
            await fs.rm(archivePath, { force: true })
  
            this.logger.info(WinstonLog.RestoreCompleted, { archiveName, fileId })
            // exit the app
            process.exit(0)
        } catch (error) {
            this.logger.error(WinstonLog.RestoreFailed, { error: error.message })
            process.exit(1)
        }
    }
}
  

interface RestoreCommandOptions {
    fileId: string
    withoutPassword: boolean
}