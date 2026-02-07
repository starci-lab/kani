import type {
    ExecutorSchema
} from "@modules/databases"

/** Params for creating a runtime. */
export interface CreateRuntimeParams {
    executor: Partial<ExecutorSchema>
}

/** Result of creating a runtime. */
export type CreateRuntimeResult = void

/** Params for handling executor created event. */
export interface HandleCoordinatorExecutorCreatedParams {
    payload: {
        id: string
    }
}

/** Result of handling executor created event. */
export type HandleCoordinatorExecutorCreatedResult = void

/** Params for handling executor deleted event. */
export interface HandleExecutorDeletedParams {
    id: string
}

/** Result of handling executor deleted event. */
export type HandleExecutorDeletedResult = void
