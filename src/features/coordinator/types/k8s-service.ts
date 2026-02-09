import type {
    ExecutorSchema
} from "@modules/databases"
import {
    V1Service 
} from "@kubernetes/client-node"

/** Params for getting a Kubernetes service. */
export interface GetServiceParams {
    executor: ExecutorSchema
}

/** Result of getting a Kubernetes service. */
export type GetServiceResult = V1Service | null

/** Params for creating a Kubernetes service. */
export interface CreateServiceParams {
    executor: ExecutorSchema
}

/** Result of creating a Kubernetes service. */
export type CreateServiceResult = void

/** Params for deleting a Kubernetes service. */
export interface DeleteServiceParams {
    executorId: string
}

/** Result of deleting a Kubernetes service. */
export type DeleteServiceResult = void
