export interface MongoDumpCompletedMessage {
    dumpDirName: string
}

export interface SevenZCompressionCompletedMessage {
    archiveName: string
}

export interface BackupCompletedMessage {
    archiveName: string
}

export interface BackupFailedMessage {
    error: string
}

export interface SevenZExtractionCompletedMessage {
    archiveName: string
}

export interface MongoDBRestoreCompletedMessage {
    dbName: string
    fileId: string
}

export interface RestoreCompletedMessage {
    archiveName: string
    fileId: string
}

export interface RestoreFailedMessage {
    error: string
}

export interface SeedFailedMessage {
    error: string
}

export interface MigrationOpenSnapshotsUpdatedMessage {
    matched: number
    modified: number
}

export interface MigrationCloseSnapshotsUpdatedMessage {
    matched: number
    modified: number
}

export interface MigrationCompletedMessage {
    openSnapshots: {
        matched: number
        modified: number
    }
    closeSnapshots: {
        matched: number
        modified: number
    }
}

export interface MigrationFailedMessage {
    error: string
    stack?: string
}

export interface MigrationAvatarsCompletedMessage {
    updatedCount: number
}

export interface MigrationAvatarsFailedMessage {
    error: string
}

export interface MigrationUserTotpCompletedMessage {
    updatedCount: number
    skippedCount?: number
}

export interface MigrationUserTotpFailedMessage {
    error: string
}

export interface MigrationBotExecutorCompletedMessage {
    updatedCount: number
}

export interface MigrationBotExecutorFailedMessage {
    error: string
}

export interface MigrationIndicatorsCompletedMessage {
    updatedCount: number
}

export interface MigrationIndicatorsFailedMessage {
    error: string
}

export interface KeyGenerationFailedMessage {
    error: string
}

export interface KeyDecryptionCheckFailedMessage {
    error: string
}

export interface KeyWrittenSuccessMessage {
    keyName: string
}

export interface CommandErrorMessage {
    message: string
}
