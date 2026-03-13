import {
    Injectable, OnModuleInit 
} from "@nestjs/common"
import {
    K8SDeploymentService 
} from "./k8s-deployment.service"
import {
    K8SServiceService 
} from "./k8s-service.service"
import {
    InjectKubernetesApi, InjectKubernetesCoreApi 
} from "@modules/kubernetes"
import {
    AppsV1Api, CoreV1Api 
} from "@kubernetes/client-node"
import {
    envConfig 
} from "@modules/env"
import {
    ExecutorsLoaderService 
} from "../loaders"
import {
    createExecutorName, isCreatedExecutorName, parseExecutorId 
} from "../utils"
import {
    AsyncService, ReadinessWatcherFactoryService 
} from "@modules/mixin"
import {
    WinstonLog, 
    WinstonService
} from "@modules/winston"

@Injectable()
export class BootstrapResourceCleanupService implements OnModuleInit {
    constructor(
        @InjectKubernetesApi()
        private readonly kubernetesApi: AppsV1Api,
        @InjectKubernetesCoreApi()
        private readonly kubernetesCoreApi: CoreV1Api,
        private readonly k8sDeploymentService: K8SDeploymentService,
        private readonly k8sServiceService: K8SServiceService,
        private readonly executorsLoaderService: ExecutorsLoaderService,
        private readonly asyncService: AsyncService,
        private readonly winstonService: WinstonService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) {}
 
    /**
     * Cleanup deployments and services on application bootstrap
     */
    async onModuleInit() {
        await this.readinessWatcherFactoryService.waitUntilReady(
            ExecutorsLoaderService.name
        )
        this.cleanupDeployments()
        this.cleanupServices()
    }

    /**
     * Cleanup deployments that are not in the database
     * This method finds all Kubernetes deployments that don't have a corresponding executor in the database
     * and deletes them to keep the cluster clean.
     */
    private async cleanupDeployments() {
        try {
            // retrieve all deployments
            const deployments = await this.kubernetesApi.listNamespacedDeployment(
                {
                    namespace: envConfig().k8s.global.podNamespace,
                }
            )
            // filter out the deployments that are not in the database
            const executorIdsToDelete = deployments.items.filter(
                deployment =>
                    Array.from(this.executorsLoaderService.executorMap.values())
                        .some(
                            executor => executor.id && (
                                createExecutorName(executor.id) !== deployment?.metadata?.name
                            ) 
                        )
            ).filter(
                deployment => isCreatedExecutorName(deployment?.metadata?.name || "")
            ).map(
                deployment => parseExecutorId(deployment?.metadata?.name || "")
            ).filter(
                executorId => executorId !== null
            )
            // delete the deployments
            await this.asyncService.allMustDone(
                executorIdsToDelete.map(
                    executorId => this.k8sDeploymentService.deleteDeployment(
                        {
                            executorId 
                        }
                    )
                )
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.CleanupDeploymentsError,
                {
                    error: error.message,
                }
            )
        }
    }

    /**
     * Cleanup services that are not in the database
     * This method finds all Kubernetes services that don't have a corresponding executor in the database
     * and deletes them to keep the cluster clean.
     */
    private async cleanupServices() {
        try {
            // retrieve all services
            const services = await this.kubernetesCoreApi.listNamespacedService(
                {
                    namespace: envConfig().k8s.global.podNamespace,
                }
            )
            // filter out the services that are not in the database
            const executorIdsToDelete = services.items.filter(
                service => !Array.from(this.executorsLoaderService.executorMap.values()).some(
                    executor => executor.id && (
                        createExecutorName(executor.id) === service?.metadata?.name
                    )
                )
            ).filter(
                service => isCreatedExecutorName(service?.metadata?.name || "")
            ).map(
                service => parseExecutorId(service?.metadata?.name || "")
            ).filter(
                executorId => executorId !== null
            )
            // delete the services
            await this.asyncService.allMustDone(
                executorIdsToDelete.map(
                    executorId => this.k8sServiceService.deleteService(
                        {
                            executorId 
                        }
                    )
                )
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.CleanupServicesError,
                {
                    error: error.message,
                }
            )
        }
    }
}