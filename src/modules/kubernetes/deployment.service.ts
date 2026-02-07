import {
    Injectable 
} from "@nestjs/common"
import type {
    AppsV1Api 
} from "@kubernetes/client-node"
import {
    InjectKubernetesApi 
} from "./kubernetes.decorators"
import type {
    CreateDeploymentParams,
    CreateDeploymentResult 
} from "./types"

/**
 * Service responsible for managing Kubernetes deployments.
 *
 * @example
 * const service = new KubernetesDeploymentService(kubernetesApi)
 * await service.createDeployment({ namespace: "default", deployment: deploymentSpec })
 */
@Injectable()
export class KubernetesDeploymentService {
    constructor(
        @InjectKubernetesApi()
        private readonly kubernetesApi: AppsV1Api,
    ) { }

    /**
     * Creates a new Kubernetes deployment.
     *
     * Scaling strategy:
     * 1. When the number of users increases, the Kani coordinator 
     *    automatically creates a new Kubernetes deployment.
     *    Each deployment handles a subset of users 
     *    (e.g., users 1001 - 2000) with 1-3 replicas.
     * 2. When the number of users decreases, the coordinator 
     *    removes unnecessary deployments.
     * This ensures efficient resource usage
     * while tracking user positions in real-time.
     *
     * @param param - Deployment creation parameters
     * @returns Promise resolving when deployment is created
     *
     * @example
     * await service.createDeployment({ 
     *   namespace: "default", 
     *   deployment: deploymentSpec 
     * })
     */
    async createDeployment({ 
        namespace, 
        deployment 
    }: CreateDeploymentParams): Promise<CreateDeploymentResult> {
        // create deployment in Kubernetes cluster
        await this.kubernetesApi.createNamespacedDeployment({
            namespace,
            body: deployment,
        })
    }
}
