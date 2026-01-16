import { Inject, Injectable, Scope } from "@nestjs/common"
import { REQUEST } from "@nestjs/core"
import { createReadinessWatcherName, ReadinessWatcherFactoryService } from "@modules/mixin"
import { envConfig, K8SRecreateStrategy } from "@modules/env"
import { CoreV1Api } from "@kubernetes/client-node"
import { creatExecutorName } from "../../utils"
import { AsyncService } from "@modules/mixin"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { InjectKubernetesCoreApi } from "@modules/kubernetes"

// ServiceManagerService is responsible for ensuring that an executor Service
// exists for a given executorId.
//
// Responsibilities:
// - Create the Service if it does not exist
// - Register a readiness watcher for the executor lifecycle
//
// This service is request-scoped and marked as `durable` so that:
// - Each logical executor gets an isolated processing context
// - The same instance can be reused across multiple events belonging
//   to the same executorId
//
// This pattern is useful for managing per-executor workloads
// that need controlled lifecycle handling inside Kubernetes.
@Injectable({
    scope: Scope.REQUEST,
    durable: true,
})
export class ServiceManagerService  {
    constructor(
        // The request object injected into this processor. It contains
        // the `user` instance for whom the processor is running.
        @Inject(REQUEST)
        private readonly request: ServiceManagerRequest,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        @InjectKubernetesCoreApi()
        private readonly kubernetesCoreApi: CoreV1Api,
        private readonly asyncService: AsyncService,
        @InjectWinston()
        private readonly winstonLogger: WinstonLogger,
    ) {}

    // Register event listeners for this processor instance.
    // This lets every user have their own isolated event handling logic.
    async initialize() {
        this.readinessWatcherFactoryService.createWatcher(
            createReadinessWatcherName(
                ServiceManagerService.name, 
                {
                    executorId: this.request.executorId,
                }
            ))
        // we check if the deployment already exists
        const [service] = await this.asyncService.resolveTuple(
            this.kubernetesCoreApi.readNamespacedService({
                name: creatExecutorName(this.request.executorId),
                namespace: envConfig().kubernetes.podNamespace,
            })
        )
        if (!service) {
            // we create the deployment
            await this.createService()
            this.winstonLogger.verbose(
                WinstonLog.ServiceCreated, {
                    executorId: this.request.executorId,
                })
            return
        } 
        else if (envConfig().k8s.kaniExecutor.recreate === K8SRecreateStrategy.Recreate) {
            await this.kubernetesCoreApi.deleteNamespacedService({
                name: creatExecutorName(this.request.executorId),
                namespace: envConfig().kubernetes.podNamespace,
            })
            await this.createService()
        }
        this.winstonLogger.verbose(
            WinstonLog.ServiceRecreated, {
                executorId: this.request.executorId,
            })
        return
    }
    private async createService() {
        const name = creatExecutorName(this.request.executorId)
        await this.kubernetesCoreApi.createNamespacedService({
            namespace: envConfig().kubernetes.podNamespace,
            body: {
                metadata: {
                    name,
                    namespace: envConfig().kubernetes.podNamespace,
                    labels: {
                        "app.kubernetes.io/instance": name,
                        "app.kubernetes.io/name": "service",
                    },
                },
                spec: {
                    type: "ClusterIP",
                    selector: {
                        "app.kubernetes.io/component": "service",
                        "app.kubernetes.io/instance": name,
                        "app.kubernetes.io/name": "service",
                    },
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
    }
}

export interface ServiceManagerRequest {
    executorId: string
}