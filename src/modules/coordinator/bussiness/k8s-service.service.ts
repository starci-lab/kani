import {
    Injectable 
} from "@nestjs/common"
import {
    envConfig 
} from "@modules/env"
import {
    CoreV1Api 
} from "@kubernetes/client-node"
import {
    createExecutorName 
} from "../utils"
import {
    WinstonService, 
    WinstonLog,
} from "@modules/winston"
import {
    InjectKubernetesCoreApi 
} from "@modules/kubernetes"
import {
    AsyncService 
} from "@modules/mixin"
import {
    ExecutorSchema 
} from "@modules/databases"
import {
    K8SAnnotationsService 
} from "./k8s-annotations.service"
import {
    K8SLabelsService 
} from "./k8s-labels.service"

/**
 * Manages Kubernetes `Service` resources for executor instances.
 *
 * Responsibilities:
 * - Read a Service by executor
 * - Create a ClusterIP Service for an executor
 * - Delete a Service for an executor
 */
@Injectable()
export class K8SServiceService {
    constructor(
        @InjectKubernetesCoreApi()
        private readonly kubernetesCoreApi: CoreV1Api,
        private readonly winstonService: WinstonService,
        private readonly asyncService: AsyncService,
        private readonly k8sAnnotationsService: K8SAnnotationsService,
        private readonly k8sLabelsService: K8SLabelsService,
    ) {}

    /**
     * Get a Kubernetes Service for an executor.
     *
     * @param executor - executor schema
     */
    public async getService(executor: ExecutorSchema) {
        const name = createExecutorName(executor.id)
        const [service] = await this.asyncService.resolveTuple(
            this.kubernetesCoreApi.readNamespacedService({
                name,
                namespace: envConfig().k8s.executor.podNamespace,
            }),
        )
        return service
    }
    
    /**
     * Create a Kubernetes Service for an executor.
     *
     * This Service uses selectors from `K8SLabelsService` to route traffic
     * to Pods created by the executor Deployment.
     *
     * @param executor - executor schema
     */
    public async createService(executor: ExecutorSchema) {
        const name = createExecutorName(executor.id)
        // create the labels and annotations
        const selector = this.k8sLabelsService.getSelector(executor)
        const labels = this.k8sLabelsService.getLabels(executor)
        const annotations = this.k8sAnnotationsService.getAnnotations(executor)
        // we create the service
        await this.kubernetesCoreApi.createNamespacedService({
            namespace: envConfig().k8s.executor.podNamespace,
            body: {
                metadata: {
                    name,
                    namespace: envConfig().k8s.executor.podNamespace,
                    labels,
                    annotations,
                },
                spec: { 
                    type: "ClusterIP",
                    selector,
                    ports: [
                        {
                            port: envConfig().ports.kaniExecutor,
                            targetPort: envConfig().ports.kaniExecutor,
                            protocol: "TCP",
                            name: "app",
                        },
                    ],
                },
            },
        })
        this.winstonService.log(
            WinstonLog.ServiceCreated,
            {
                executorId: executor.id,
            }
        )
    }

    /**
     * Delete a Kubernetes Service for an executor.
     *
     * @param executor - executor schema
     */
    public async deleteService(executorId: string) {
        const name = createExecutorName(executorId)
        await this.kubernetesCoreApi.deleteNamespacedService({
            name,
            namespace: envConfig().k8s.executor.podNamespace,
        })
        this.winstonService.log(
            WinstonLog.ServiceDeleted,
            {
                executorId,
            })
    }
}
