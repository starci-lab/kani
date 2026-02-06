export interface CleanupDeploymentsErrorMessage {
    error: string
}

export interface CleanupServicesErrorMessage {
    error: string
}

export interface DeploymentCreatedMessage {
    executorId: string
}

export interface DeploymentDeletedMessage {
    executorId: string
}

export interface DeploymentPatchedMessage {
    executorId: string
}

export interface DeploymentPatchFailedMessage {
    executorId: string
    error: string
}

export interface DeploymentCreateFailedMessage {
    executorId: string
    error: string
}

export interface DeploymentDeleteFailedMessage {
    executorId: string
    error: string
}

export interface ServiceCreatedMessage {
    executorId: string
}

export interface ServiceDeletedMessage {
    executorId: string
}

export interface ServiceCreateFailedMessage {
    executorId: string
    error: string
}

export interface ServiceDeleteFailedMessage {
    executorId: string
    error: string
}

export interface CoordinatorExecutorsCreatedMessage {
    ids: Array<string>
}

export interface CoordinatorExecutorsDeletedMessage {
    ids: Array<string>
}

export interface CoordinatorExecutorsUpdatedMessage {
    ids: Array<string>
}

export interface CoordinatorPrimaryMongoDbChangeStreamErrorMessage {
    streamName: string
    error: string
}

export interface CoordinatorPrimaryMongoDbChangeStreamCloseMessage {
    streamName: string
}

export interface CoordinatorPrimaryMongoDbChangeStreamStartedMessage {
    streamName: string
}

export interface CoordinatorPrimaryMongoDbChangeStreamExecutorCreatedMessage {
    id: string
}

export interface CoordinatorPrimaryMongoDbChangeStreamExecutorDeletedMessage {
    id: string
}

export interface CoordinatorPrimaryMongoDbChangeStreamExecutorUpdatedMessage {
    id: string
}

export interface ExecutorBotsUpdatedMessage {
    ids: Array<string>
}

export interface ExecutorBotsCreatedMessage {
    ids: Array<string>
}

export interface ExecutorBotsDeletedMessage {
    ids: Array<string>
}

export interface ExecutorMongoDbChangeStreamErrorMessage {
    streamName: string
    error: string
}

export interface ExecutorMongoDbChangeStreamCloseMessage {
    streamName: string
}

export interface ExecutorMongoDbChangeStreamStartedMessage {
    streamName: string
}

export interface ExecutorMongoDbChangeStreamBotUpdatedMessage {
    id: string
}

export interface ExecutorRuntimeInitializationFailedMessage {
    executorId: string
    error: string
}

export interface CoordinatorRuntimeInitializationFailedMessage {
    coordinatorId: string
    error: string
}

export interface ExecutorNotFoundMessage {
    id: string
}
