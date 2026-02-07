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
    K8SAnnotationsService 
} from "./k8s-annotations.service"
import {
    K8SLabelsService 
} from "./k8s-labels.service"
import type {
    GetServiceParams,
    GetServiceResult,
    CreateServiceParams,
    CreateServiceResult,
    DeleteServiceParams,
    DeleteServiceResult
} from "../types"

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
     * @param param - Parameters for getting service
     * @returns The Kubernetes service
     *
     * @example
     * const service = await service.getService({ executor })
     */
    public async getService({ executor }: GetServiceParams): Promise<GetServiceResult> {
        // create service name from executor ID
        const name = createExecutorName(executor.id)
        
        // retrieve service from Kubernetes
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
     * @param param - Parameters for creating service
     * @returns Promise that resolves when service is created
     *
     * @example
     * await service.createService({ executor })
     */
    public async createService({ executor }: CreateServiceParams): Promise<CreateServiceResult> {
        // create service name from executor ID
        const name = createExecutorName(executor.id)
        
        // build labels and annotations
        const selector = this.k8sLabelsService.getSelector({
            executor 
        })
        const labels = this.k8sLabelsService.getLabels({
            executor 
        })
        const annotations = this.k8sAnnotationsService.getAnnotations({
            executor 
        })
        
        // create service in Kubernetes
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
        
        // log service creation
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
     * @param param - Parameters for deleting service
     * @returns Promise that resolves when service is deleted
     *
     * @example
     * await service.deleteService({ executorId })
     */
    public async deleteService({ executorId }: DeleteServiceParams): Promise<DeleteServiceResult> {
        // create service name from executor ID
        const name = createExecutorName(executorId)
        
        // delete service from Kubernetes
        await this.kubernetesCoreApi.deleteNamespacedService({
            name,
            namespace: envConfig().k8s.executor.podNamespace,
        })
        
        // log service deletion
        this.winstonService.log(
            WinstonLog.ServiceDeleted,
            {
                executorId,
            })
    }
}
