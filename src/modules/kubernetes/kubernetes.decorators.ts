import {
    Inject 
} from "@nestjs/common"
import {
    KUBERNETES_API,
    KUBERNETES_CLIENT,
    KUBERNETES_CORE_API 
} from "./constants"

/** Decorator to inject Kubernetes client. */
export const InjectKubernetesClient = () => Inject(KUBERNETES_CLIENT)   

/** Decorator to inject Kubernetes Apps V1 API. */
export const InjectKubernetesApi = () => Inject(KUBERNETES_API)   

/** Decorator to inject Kubernetes Core V1 API. */
export const InjectKubernetesCoreApi = () => Inject(KUBERNETES_CORE_API)