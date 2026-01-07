import { Injectable } from "@nestjs/common"
import { drive_v3 } from "googleapis/build/src/apis/drive"
import { GoogleAuth } from "google-auth-library"
import { GoogleDriveFolderId } from "./types"
import { MountStorageService } from "@modules/filesystem"
import { InjectWinston } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { GoogleDriveFolderIdNotFoundException } from "@exceptions"
import path from "path"
import { Readable } from "stream"
import fs from "fs"
import { WinstonLog } from "@modules/winston"

export interface UploadFilesParams {
    files: Array<Express.Multer.File>
    folderEnum: GoogleDriveFolderId
}

@Injectable()
export class GoogleDriveService {
    public auth: GoogleAuth
    public drive: drive_v3.Drive
    constructor(
        private readonly mountStorageService: MountStorageService,
        @InjectWinston()
        private readonly logger: WinstonLogger
    ) {
        this.auth = new GoogleAuth({
            keyFile: this.mountStorageService.googleDriveUdSa,
            scopes: ["https://www.googleapis.com/auth/drive"],
        })
        this.drive = new drive_v3.Drive({ auth: this.auth })
    }

    private folderEnumToId(folderEnum: GoogleDriveFolderId): string {
        switch (folderEnum) {
        case GoogleDriveFolderId.Db:
            return this.mountStorageService.appConfig.googleapis.drive.folderIds.db
        case GoogleDriveFolderId.Keys:
            return this.mountStorageService.appConfig.googleapis.drive.folderIds.keys
        }
    }

    public async uploadFiles(
        {
            files,
            folderEnum
        }: UploadFilesParams
    ): Promise<void> {
        const folderId = this.folderEnumToId(folderEnum)
        if (!folderId) {
            throw new GoogleDriveFolderIdNotFoundException("Unknown folder enum", folderEnum)
        }
        for (const file of files) {
            const response = await this.drive.files.create({
                requestBody: {
                    name: file.originalname ?? path.basename(file.path),
                    parents: [folderId],
                },
                media: {
                    mimeType: file.mimetype ?? "application/octet-stream",
                    body: Readable.from(file.buffer),
                },
                supportsAllDrives: true,
                fields: "id",
            })
            this.logger.info(
                WinstonLog.GoogleDriveFileUploaded, 
                {
                    fileId: response.data.id,
                    folderId,
                    filePath: file.path,
                }
            )
        }
    }

    public async downloadFile(
        id: string,
        outputPath: string
    ): Promise<void> {
        // get the zipped file  
        // Get the file content as a stream
        const response = await this.drive.files.get({
            fileId: id,
            alt: "media"
        }, { responseType: "stream" })
        // Create the directory if it doesn't exist
        await fs.promises.mkdir(path.dirname(outputPath), { recursive: true })
        // Create a write stream to save the file
        const dest = fs.createWriteStream(outputPath)
        // Return a promise that resolves when download completes
        return new Promise<void>((resolve, reject) => {
            // Pipe the download stream to the file
            (response.data as Readable)
                .pipe(dest)
                .on("finish", () => {
                    this.logger.verbose(
                        WinstonLog.GoogleDriveFileDownloaded, 
                        { 
                            outputPath 
                        }
                    )
                    resolve()
                })
                .on("error", (error) => {
                    this.logger.error(
                        WinstonLog.GoogleDriveFileDownloadError, 
                        { 
                            error: error.message 
                        }
                    )
                    fs.unlink(outputPath, () => {}) // Clean up partial download
                    reject(error)
                })
        })
    }
}


