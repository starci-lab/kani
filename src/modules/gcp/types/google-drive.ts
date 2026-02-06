import type {
    GoogleDriveFolderName,
} from "../enums"

/** Single file item for upload (buffer or path). */
export interface UploadFileItem {
    buffer: Buffer
    path: string
    originalname?: string
    mimetype?: string
}

/** Params for uploading files to a Drive folder. */
export interface UploadFilesParams {
    files: Array<UploadFileItem>
    folderName: GoogleDriveFolderName
}

/** Params for downloading a file by ID to a local path. */
export interface DownloadFileParams {
    id: string
    outputPath: string
}

/** Result of download (write completed). */
export type DownloadFileResult = void
