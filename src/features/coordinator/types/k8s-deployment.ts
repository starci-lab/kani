import type {
    ExecutorSchema
} from "@modules/databases"

/** Params for getting a Kubernetes deployment. */
export interface GetDeploymentParams {
    executor: ExecutorSchema
}

/** Result of getting a Kubernetes deployment. */
export type GetDeploymentResult = unknown

/** Params for creating a Kubernetes deployment. */
export interface CreateDeploymentParams {
    executor: ExecutorSchema
}

/** Result of creating a Kubernetes deployment. */
export type CreateDeploymentResult = void

/** Params for patching a Kubernetes deployment. */
export interface PatchDeploymentParams {
    executor: ExecutorSchema
}

/** Result of patching a Kubernetes deployment. */
export type PatchDeploymentResult = void

/** Params for deleting a Kubernetes deployment. */
export interface DeleteDeploymentParams {
    executorId: string
}

/** Result of deleting a Kubernetes deployment. */
export type DeleteDeploymentResult = void
