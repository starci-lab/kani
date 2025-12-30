import { Injectable, OnModuleInit } from "@nestjs/common"
import { Auth, drive_v3 } from "googleapis"
import { Readable } from "stream"
import fs from "fs"
import { MountStorageService } from "@modules/filesystem"
import { GoogleDriveFolderIdNotFoundException } from "@exceptions"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import path from "path"
import { envConfig } from "@modules/env"

@Injectable()
export class GoogleDriveService implements OnModuleInit {
    public auth: Auth.GoogleAuth
    public drive: drive_v3.Drive
    constructor(
        private readonly mountStorageService: MountStorageService,
        @InjectWinston()
        private readonly logger: WinstonLogger
    ) {}

    onModuleInit() {
        this.auth = new Auth.GoogleAuth({
            keyFile: envConfig().mountPath.gcp.googleDriveUdSa,
            scopes: ["https://www.googleapis.com/auth/drive"],
        })
        this.drive = new drive_v3.Drive({ auth: this.auth })
    }

    public async uploadFolder(
        {
            folderName,
            files
        }: UploadFolderParams
    ): Promise<string> {
        // 1. Create a new folder on Google Drive
        const folderResponse = await this.drive.files.create({
            requestBody: {
                name: folderName,
                mimeType: "application/vnd.google-apps.folder",
                parents: [this.mountStorageService.apiKeys.googleapis.drive.folderId],
            },
            supportsAllDrives: true,
            fields: "id",
        })
        this.logger.verbose(WinstonLog.GoogleDriveFolderCreated, { folderId: folderResponse.data.id })
        const folderId = folderResponse.data.id
        if (!folderId) {
            throw new GoogleDriveFolderIdNotFoundException(this.mountStorageService.apiKeys.googleapis.drive.folderId)
        }
        // 2. Upload each file to the new folder
        for (const file of files) {
            const media = {
                mimeType: file.mimetype,
                body: Readable.from(file.buffer),
            }
            const fileResponse = await this.drive.files.create({
                requestBody: {
                    name: file.originalname,
                    mimeType: file.mimetype,
                    parents: [folderId],
                },
                supportsAllDrives: true,
                media: media,
                fields: "id",
            })
            this.logger.verbose(WinstonLog.GoogleDriveFileUploaded, { fileId: fileResponse.data.id })
        }
      
        // 3. Return the folder URL
        return `https://drive.google.com/drive/folders/${folderId}`
    }

    public async uploadFiles(
        {
            files
        }: UploadFilesParams
    ): Promise<void> {
        for (const file of files) {
            const response = await this.drive.files.create({
                requestBody: {
                    name: file.originalname ?? path.basename(file.path),
                    parents: [this.mountStorageService.apiKeys.googleapis.drive.folderId],
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
                    folderId: this.mountStorageService.apiKeys.googleapis.drive.folderId,
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
        // Create a write stream to save the file
        const dest = fs.createWriteStream(outputPath)
        // Return a promise that resolves when download completes
        return new Promise<void>((resolve, reject) => {
            // Pipe the download stream to the file
            (response.data as Readable)
                .pipe(dest)
                .on("finish", () => {
                    this.logger.verbose(WinstonLog.GoogleDriveFileDownloaded, { outputPath })
                    resolve()
                })
                .on("error", (error) => {
                    this.logger.error(WinstonLog.GoogleDriveFileDownloadError, { error: error.message })
                    fs.unlink(outputPath, () => {}) // Clean up partial download
                    reject(error)
                })
        })
    }
}

export interface UploadFolderParams {
    folderName: string
    files: Array<Express.Multer.File>
}

export interface UploadFilesParams {
    files: Array<Express.Multer.File>
}