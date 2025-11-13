import { Inject } from "@nestjs/common"
import { KUBERNETES_CLIENT } from "./constants"

export const InjectKubernetesClient = () => Inject(KUBERNETES_CLIENT)   