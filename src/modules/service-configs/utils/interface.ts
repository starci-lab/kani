import {
    runInKubernetes
} from "@modules/env/utils"
import {
    envConfig
} from "@modules/env"
import type {
    BuildInterfaceFullEndpointPathParams
} from "../types"

/**
 * Build interface service endpoint based on runtime environment.
 *
 * - In Kubernetes: resolve interface by its Pod DNS name inside the cluster
 * - In local/dev: fallback to localhost using configured port
 */
export const buildInterfaceEndpoint = () => {
    if (runInKubernetes()) {
        return `http://kani-interface.${envConfig().k8s.global.podNamespace}.svc.cluster.local:3000`
    }
    return `http://localhost:${envConfig().ports.kaniInterface}`
}

/** Build interface endpoint path from tags and api. */
export const buildInterfaceEndpointPath = (tags: string, api: string) =>
    `${tags}/${api}`

/** Build full interface endpoint URL (base + /api/ + path). */
export const buildInterfaceFullEndpointPath = ({
    tags,
    api,
}: BuildInterfaceFullEndpointPathParams) =>
    `${buildInterfaceEndpoint()}/api/${buildInterfaceEndpointPath(tags,
        api)}`
