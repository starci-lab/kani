import {
    AbstractException,
    AbstractExceptionMetadata,
} from "../abstract"

/** Thrown when Google drive folder id not found */
export interface GoogleDriveFolderIdNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    folderName: string
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