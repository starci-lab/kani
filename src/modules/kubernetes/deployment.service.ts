import { Injectable } from "@nestjs/common"
import { AppsV1Api } from "@kubernetes/client-node"
import { InjectKubernetesApi } from "./kubernetes.decorators"
import { V1Deployment } from "@kubernetes/client-node"

@Injectable()
export class KubernetesDeploymentService {
    constructor(
        @InjectKubernetesApi()
        private readonly kubernetesApi: AppsV1Api,

    ) { }
    // Scaling strategy:
    // 1. When the number of users increases, the Kani coordinator 
    // automatically creates a new Kubernetes deployment.
    //    Each deployment handles a subset of users 
    // (e.g., users 1001 - 2000) with 1-3 replicas.
    // 2. When the number of users decreases, the coordinator 
    // removes unnecessary deployments.
    // This ensures efficient resource usage
    //  while tracking user positions in real-time.
    async createDeployment({ 
        namespace, 
        deployment 
    }: CreateDeploymentParams): Promise<void> {
        await this.kubernetesApi.createNamespacedDeployment({
            namespace,
            body: deployment,
        })
    }
}

export interface CreateDeploymentParams {
    namespace: string
    deployment: V1Deployment
}