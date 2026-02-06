import type {
    GoogleDriveFolderName,
} from "../enums"

/** Params for uploading files to a Drive folder. */
export interface UploadFilesParams {
    files: Array<Express.Multer.File>
    folderName: GoogleDriveFolderName
}

/** Params for downloading a file by ID to a local path. */
export interface DownloadFileParams {
    id: string
    outputPath: string
}

/** Result of download (write completed). */
export type DownloadFileResult = void
