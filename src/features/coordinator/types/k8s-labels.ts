import type {
    ExecutorSchema
} from "@modules/databases"

/** Params for getting Kubernetes selector labels. */
export interface GetSelectorParams {
    executor: ExecutorSchema
}

/** Result of getting Kubernetes selector labels. */
export type GetSelectorResult = Record<string, string>

/** Params for getting Kubernetes labels. */
export interface GetLabelsParams {
    executor: ExecutorSchema
}

/** Result of getting Kubernetes labels. */
export type GetLabelsResult = Record<string, string>
