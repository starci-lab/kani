import {
    AbstractException,
    AbstractExceptionMetadata,
} from "../abstract"
import {
    GoogleDriveFolderName,
} from "@modules/gcp"
/** Thrown when Google drive folder id not found */
export interface GoogleDriveFolderIdNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    folderName: GoogleDriveFolderName
}
export class GoogleDriveFolderIdNotFoundException extends AbstractException {
    constructor(
        { folderName }: GoogleDriveFolderIdNotFoundExceptionMetadata
    ) {
        super("Google drive folder id not found",
            "GOOGLE_DRIVE_FOLDER_ID_NOT_FOUND_EXCEPTION",
            {
                folderName,
            })
    }
}

/** Thrown when upload file has neither buffer nor path */
export interface GoogleDriveUploadFileInvalidExceptionMetadata extends AbstractExceptionMetadata {
    originalname?: string
}
export class GoogleDriveUploadFileInvalidException extends AbstractException {
    constructor(
        metadata?: GoogleDriveUploadFileInvalidExceptionMetadata
    ) {
        super(
            "Google drive upload file has neither buffer nor path",
            "GOOGLE_DRIVE_UPLOAD_FILE_INVALID_EXCEPTION",
            metadata ?? {},
        )
    }
}

/** Thrown when Google drive file download fails */
export interface GoogleDriveFileDownloadFailedExceptionMetadata extends AbstractExceptionMetadata {
    fileId: string
    outputPath: string
}
export class GoogleDriveFileDownloadFailedException extends AbstractException {
    constructor(
        { fileId, outputPath, originalError }: GoogleDriveFileDownloadFailedExceptionMetadata
    ) {
        super("Google drive file download failed",
            "GOOGLE_DRIVE_FILE_DOWNLOAD_FAILED_EXCEPTION",
            {
                fileId,
                outputPath,
                originalError,
            }
        )
    }
}