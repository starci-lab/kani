import {
    Injectable 
} from "@nestjs/common"
import {
    drive_v3,
    google,
} from "googleapis"
import {
    GoogleAuth 
} from "google-auth-library"
import {
    GoogleDriveFolderName 
} from "./types"
import {
    MountStorageService 
} from "@modules/filesystem"
import {
    GoogleDriveFileDownloadFailedException,
    GoogleDriveFolderIdNotFoundException,
} from "@exceptions"
import path from "path"
import {
    Readable 
} from "stream"
import {
    pipeline,
} from "stream/promises"
import {
    WinstonService,
    WinstonLog 
} from "@modules/winston"
import {
    envConfig 
} from "@modules/env"
import fsPromises from "fs/promises"
import fs from "fs"
import {
    RetryService,
} from "@modules/mixin"

export interface UploadFilesParams {
    files: Array<Express.Multer.File>
    folderName: GoogleDriveFolderName
}

@Injectable()
export class GoogleDriveService {
    public auth: GoogleAuth
    public drive: drive_v3.Drive
    constructor(
        private readonly mountStorageService: MountStorageService,
        private readonly winstonService: WinstonService,
        private readonly retryService: RetryService,
    ) {
        this.auth = new GoogleAuth({
            keyFile: envConfig().mountPath.terraform.gcpGoogleDriveUdSa,
            scopes: ["https://www.googleapis.com/auth/drive"],
        })
        this.drive = google.drive({
            version: "v3",
            auth: this.auth,
        })
    }

    private folderNameToId(folderName: GoogleDriveFolderName): string | undefined {
        switch (folderName) {
        case GoogleDriveFolderName.Db:
            return this.mountStorageService.appConfig.drive.folderIds.db
        case GoogleDriveFolderName.Keys:
            return this.mountStorageService.appConfig.drive.folderIds.keys
        default:
            return undefined
        }
    }

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
                        throw new Error("GoogleDriveService.uploadFiles: file has neither buffer nor path")
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

    public async downloadFile(
        id: string,
        outputPath: string
    ): Promise<void> {
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


