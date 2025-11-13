import { KUBERNETES_API, KUBERNETES_CLIENT } from "./constants"
import * as k8s from "@kubernetes/client-node"
import { KubeConfig } from "@kubernetes/client-node"
import { Provider } from "@nestjs/common"

export const createKubernetesClientProvider = (): Provider => ({
    provide: KUBERNETES_CLIENT,
    useFactory: () => {
        const kubeConfig = new k8s.KubeConfig()
        kubeConfig.loadFromDefault()
        return kubeConfig
    }
})

export const createKubernetesApiProvider = (): Provider => ({
    provide: KUBERNETES_API,
    inject: [KUBERNETES_CLIENT],
    useFactory: (kubeConfig: KubeConfig ) => {
        return kubeConfig.makeApiClient(k8s.AppsV1Api)
    }
})