
import { CommandRunner, Option, SubCommand } from "nest-commander"
import { InjectPrimaryMongoose } from "@modules/databases"
import { Connection } from "mongoose"
import { ExecaService } from "@modules/execa"
import path from "path"
import { GoogleDriveService } from "@modules/googleapis"
import fsPromises from "fs/promises"
import { envConfig   } from "@modules/env"
import { v4 as uuidv4 } from "uuid" 
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { Logger } from "@nestjs/common"

interface RestoreCommandOptions {
    id?: string
}

@SubCommand({ name: "restore", description: "Restore the database" })
export class RestoreCommand extends CommandRunner {
    private readonly logger = new Logger(RestoreCommand.name)
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly execaService: ExecaService,
        private readonly googleDriveService: GoogleDriveService,
        @InjectWinston()
        private readonly winstonLogger: WinstonLogger
    ) {
        super()
    }

    async run(_: Array<string>, options?: RestoreCommandOptions): Promise<void> {
        if (!options?.id) {
            this.logger.error("ID (--id) is required to restore the database.")
            return
        }
        const dbName = this.connection.name
        const host = this.connection.host
        const port = this.connection.port
        // create the uri
        const uri = `"mongodb://${envConfig().databases.mongoose.primary.username}:${envConfig().databases.mongoose.primary.password}@${host}:${port}/?authSource=admin&readPreference=primary"`
        const restoreDir = envConfig().mountPath.googleapis.googleDrive
        // create the restore dir if it doesn't exist
        await fsPromises.mkdir(restoreDir, { recursive: true })
        const restoreFolder = path.join(restoreDir, `cifarm-restore-${uuidv4()}`)
        // create the restore folder if it doesn't exist
        await fsPromises.mkdir(restoreFolder, { recursive: true })
        // create the zip file path
        const zipFilePath = path.join(restoreFolder, "data.zip")
        await this.googleDriveService.downloadFile(options.id, zipFilePath)
        // run command to 7z the file
        await this.execaService.exec("7z", ["x", zipFilePath, `-o${restoreFolder}`])
        // get the folder name
        const foldersNames = await fsPromises.readdir(restoreFolder)
        const folderName = foldersNames.at(0)
        if (!folderName) {
            this.winstonLogger.error(
                WinstonLog.DatabaseRestoreError, {
                    error: "No folder name found in the restore directory.",
                    restoreFolder: restoreFolder
                })
            return
        }
        this.winstonLogger.log(
            WinstonLog.DatabaseRestoreStarted, {
                folderName: folderName,
                restoreFolder: restoreFolder
            })
        // run command to restore the database
        await this.execaService.exec("mongorestore", [`--uri=${uri}`, 
            `--dir=${restoreFolder}/${folderName}`,
            "--gzip",
            "--drop",
            "--quiet",
            `--db="${dbName}"`
        ])
        // delete everything in the restore folder
        await fsPromises.rm(restoreFolder, { recursive: true })
        // log the folder name
        this.winstonLogger.log(
            WinstonLog.DatabaseRestoreCompleted, {
                folderName: folderName,
                restoreFolder: restoreFolder
            })
    }

    @Option({
        flags: "--id",
        description: "The id of the folder to restore from",
        defaultValue: "1pBjakD2Zc57a_tosDqKsegHgokKQCPlT"
    })
    parseId(id: string): string {
        return id
    }
}
