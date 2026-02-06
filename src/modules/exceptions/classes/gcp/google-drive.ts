import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"
import type {
    GoogleDriveFolderName 
} from "@modules/gcp"
/** Thrown when Google drive folder id not found */
export interface GoogleDriveFolderIdNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    folderName: GoogleDriveFolderName
}

/** Thrown when Google Drive folder ID is not found. */
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

/** Thrown when upload file has neither buffer nor path. */
export class GoogleDriveUploadFileInvalidException extends AbstractException {
    constructor(
        metadata?: GoogleDriveUploadFileInvalidExceptionMetadata
    ) {
        super(
            "Google drive upload file has neither buffer nor path",
            "GOOGLE_DRIVE_UPLOAD_FILE_INVALID_EXCEPTION",
            metadata ?? {
            },
        )
    }
}

/** Thrown when Google drive file download fails */
export interface GoogleDriveFileDownloadFailedExceptionMetadata extends AbstractExceptionMetadata {
    fileId: string
    outputPath: string
}

/** Thrown when Google Drive file download fails. */
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