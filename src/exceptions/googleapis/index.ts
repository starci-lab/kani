import { AbstractException } from "../abstract"

export class GoogleDriveFolderIdNotFoundException extends AbstractException {
    constructor(id: string, message?: string) {
        super(message || `Google Drive folder id ${id} not found`, "GOOGLE_DRIVE_FOLDER_ID_NOT_FOUND_EXCEPTION", { id })
    }
}