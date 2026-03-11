import {
    Injectable
} from "@nestjs/common"
import {
    drive_v3
} from "googleapis/build/src/apis/drive/v3"
import {
    GoogleAuth
} from "google-auth-library"
import {
    GoogleDriveFolderName,
} from "./enums"
import {
    GoogleDriveFileDownloadFailedException,
    GoogleDriveFolderIdNotFoundException,
    GoogleDriveUploadFileInvalidException
} from "@modules/exceptions"
import {
    MountStorageService
} from "@modules/filesystem"
import {
    envConfig
} from "@modules/env"
import {
    RetryService
} from "@modules/mixin"
import {
    WinstonLog,
    WinstonService
} from "@modules/winston"
import fs from "fs"
import fsPromises from "fs/promises"
import path from "path"
import {
    Readable
} from "stream"
import {
    pipeline
} from "stream/promises"
import type {
    DownloadFileParams,
    DownloadFileResult,
    UploadFilesParams
} from "./types"

/**
 * Service for Google Drive operations.
 */
@Injectable()
export class GoogleDriveService {
    public auth: GoogleAuth
    public drive: drive_v3.Drive
    constructor(
        private readonly mountStorageService: MountStorageService,
        private readonly winstonService: WinstonService,
        private readonly retryService: RetryService,
    ) {
        this.auth = new GoogleAuth(
            {
                keyFile: envConfig().mountPath.terraform.gcpGoogleDriveUdSa,
                scopes: ["https://www.googleapis.com/auth/drive"],
            }
        )
        this.drive = new drive_v3.Drive({
            auth: this.auth,
        })
    }
 
    /**
     * Converts a folder name to a folder ID.
     * @param folderName - The name of the folder.
     * @returns The ID of the folder.
     */
    private folderNameToId(
        folderName: GoogleDriveFolderName
    ): string | undefined {
        switch (folderName) {
        case GoogleDriveFolderName.Db:
            return this.mountStorageService.appConfig.drive.folderIds.db
        case GoogleDriveFolderName.Keys:
            return this.mountStorageService.appConfig.drive.folderIds.keys
        default:
            return undefined
        }
    }

    /**
     * Uploads files to Google Drive.
     * @param params - The parameters for the upload.
     * @returns The result of the upload.
     */
    public async uploadFiles(
        {
            files,
            folderName
        }: UploadFilesParams
    ): Promise<void> {
        return await this.retryService.retry({
            action: async () => {
                const folderId = this.folderNameToId(folderName)
                if (!folderId) {
                    throw new GoogleDriveFolderIdNotFoundException({
                        folderName,
                    })
                }
                for (const file of files) {
                    const body = file.buffer
                        ? Readable.from(file.buffer)
                        : file.path
                            ? fs.createReadStream(file.path)
                            : undefined
                    if (!body) {
                        throw new GoogleDriveUploadFileInvalidException({
                            originalname: file.originalname,
                        })
                    }
                    const response = await this.drive.files.create({
                        requestBody: {
                            name: file.originalname ?? path.basename(file.path),
                            parents: [folderId],
                        },
                        media: {
                            mimeType: file.mimetype ?? "application/octet-stream",
                            body,
                        },
                        supportsAllDrives: true,
                        fields: "id",
                    })
                    this.winstonService.log(
                        WinstonLog.GoogleDriveFileUploaded, 
                        {
                            fileId: response.data.id ?? "",
                            folderId,
                            filePath: file.path,
                        }
                    )
                }
            }
        })
    }

    /**
     * Download a file from Google Drive by ID and write to outputPath.
     *
     * @param params - id (file ID), outputPath (local path)
     * @returns Promise that resolves when the file is written
     */
    public async downloadFile(params: DownloadFileParams): Promise<DownloadFileResult> {
        const { id, outputPath } = params
        return await this.retryService.retry({
            action: async () => {
                try {
                    const response = await this.drive.files.get(
                        {
                            fileId: id,
                            alt: "media",
                            supportsAllDrives: true,
                        },
                        {
                            responseType: "stream",
                        },
                    )
                    await fsPromises.mkdir(path.dirname(outputPath),
                        {
                            recursive: true,
                        })
                    const dest = fs.createWriteStream(outputPath)
                    await pipeline(
                        response.data as unknown as NodeJS.ReadableStream,
                        dest,
                    )
                    this.winstonService.log(
                        WinstonLog.GoogleDriveFileDownloaded,
                        {
                            outputPath,
                        },
                    )
                } catch (error) {
                    console.log(error)
                    throw new GoogleDriveFileDownloadFailedException({
                        fileId: id,
                        outputPath,
                        originalError: error,
                    })
                }
            },
        })
    }
}


