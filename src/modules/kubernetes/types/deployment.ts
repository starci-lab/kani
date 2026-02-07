import type {
    V1Deployment 
} from "@kubernetes/client-node"

/** Params for creating a Kubernetes deployment. */
export interface CreateDeploymentParams {
    namespace: string
    deployment: V1Deployment
}

/** Result of creating a Kubernetes deployment. */
export type CreateDeploymentResult = void
