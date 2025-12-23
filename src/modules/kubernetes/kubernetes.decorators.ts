import { Inject } from "@nestjs/common"
import { KUBERNETES_API, KUBERNETES_CLIENT, KUBERNETES_CORE_API } from "./constants"

export const InjectKubernetesClient = () => Inject(KUBERNETES_CLIENT)   
export const InjectKubernetesApi = () => Inject(KUBERNETES_API)   
export const InjectKubernetesCoreApi = () => Inject(KUBERNETES_CORE_API)