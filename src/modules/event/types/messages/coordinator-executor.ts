import {
    ExecutorSchema,
} from "@modules/databases"

export interface CoordinatorExecutorCreatedEventPayload {
    id: string
}

export interface CoordinatorExecutorDeletedEventPayload {
    id: string
}

export type CoordinatorExecutorUpdatedEventPayload = ExecutorSchema
