import {
    Provider 
} from "@nestjs/common"
import * as k8s from "@kubernetes/client-node"
import type {
    KubeConfig 
} from "@kubernetes/client-node"
import {
    KUBERNETES_API,
    KUBERNETES_CLIENT,
    KUBERNETES_CORE_API 
} from "./constants"

export const createKubernetesClientProvider = (): Provider => ({
    provide: KUBERNETES_CLIENT,
    useFactory: () => {
        // initialize Kubernetes config from default location
        const kubeConfig = new k8s.KubeConfig()
        kubeConfig.loadFromDefault()
        return kubeConfig
    }
})

export const createKubernetesApiProvider = (): Provider => ({
    provide: KUBERNETES_API,
    inject: [KUBERNETES_CLIENT],
    useFactory: (kubeConfig: KubeConfig) => {
        // create Apps V1 API client for deployment management
        return kubeConfig.makeApiClient(k8s.AppsV1Api)
    }
})

export const createKubernetesCoreApiProvider = (): Provider => ({
    provide: KUBERNETES_CORE_API,
    inject: [KUBERNETES_CLIENT],
    useFactory: (kubeConfig: KubeConfig) => {
        // create Core V1 API client for core resources
        return kubeConfig.makeApiClient(k8s.CoreV1Api)
    }
}) 