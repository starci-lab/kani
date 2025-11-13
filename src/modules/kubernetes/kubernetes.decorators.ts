import { Inject } from "@nestjs/common"
import { KUBERNETES_API, KUBERNETES_CLIENT } from "./constants"

export const InjectKubernetesClient = () => Inject(KUBERNETES_CLIENT)   
export const InjectKubernetesApi = () => Inject(KUBERNETES_API)   
