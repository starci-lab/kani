import type {
    ExecutorSchema
} from "@modules/databases"

/** Params for getting Kubernetes annotations. */
export interface GetAnnotationsParams {
    executor: ExecutorSchema
}

/** Result of getting Kubernetes annotations. */
export type GetAnnotationsResult = Record<string, string>
