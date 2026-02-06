/** Google Drive File Uploaded Message */
export interface GoogleDriveFileUploadedMessage {
    fileId?: string
    folderId?: string
    filePath?: string
    archiveName?: string
}

/** Google Drive File Downloaded Message */
export interface GoogleDriveFileDownloadedMessage {
    outputPath?: string
    fileId?: string
    archiveName?: string
}

/** Google Drive File Download Error Message */
export interface GoogleDriveFileDownloadErrorMessage {
    error: string
}
