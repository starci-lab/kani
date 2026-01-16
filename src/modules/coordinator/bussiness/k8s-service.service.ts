import { Injectable } from "@nestjs/common"
import { envConfig } from "@modules/env"
import { CoreV1Api } from "@kubernetes/client-node"
import { createExecutorName } from "../utils"
import { InjectWinston } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { InjectKubernetesCoreApi } from "@modules/kubernetes"
import { WinstonLog } from "@modules/winston"

// K8SServiceManagerService is responsible for managing Kubernetes Services
// for executor instances.
//
// Responsibilities:
// - Create a new ClusterIP Service for an executor if it doesn't exist
// - Recreate the Service if the recreate strategy is configured
// - Register a readiness watcher for the executor lifecycle
//
// This service is a singleton that accepts executorId as a parameter,
// allowing it to manage Services for multiple executors using the same instance.
@Injectable()
export class K8SServiceService  {
    constructor(
        @InjectKubernetesCoreApi()
        private readonly kubernetesCoreApi: CoreV1Api,
        @InjectWinston()
        private readonly winstonLogger: WinstonLogger,
    ) {}

    /**
     * Creates a new Kubernetes Service for an executor.
     * 
     * This method creates a fully configured Service with:
     * - ClusterIP type to allow internal communication within the cluster
     * - Selector to match the pods created by the Deployment
     * - Port mapping to the executor's port
     * 
     * @param executorId - The unique identifier of the executor
     * @returns Promise that resolves when the Service is created
     * @throws Error if the Service creation fails
     */
    public async createService(
        executorId: string
    ) {
        const name = createExecutorName(executorId)
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
        this.winstonLogger.verbose(
            WinstonLog.ServiceCreated, {
                executorId,
            }
        )
    }

    /**
     * Deletes a Kubernetes Service for an executor.
     * 
     * This method removes the Service from the Kubernetes cluster.
     * 
     * @param executorId - The unique identifier of the executor
     * @returns Promise that resolves when the Service is deleted
     * @throws Error if the Service deletion fails
     */
    public async deleteService(
        executorId: string
    ) {
        const name = createExecutorName(executorId)
        await this.kubernetesCoreApi.deleteNamespacedService({
            name,
            namespace: envConfig().kubernetes.podNamespace,
        })
        this.winstonLogger.verbose(
            WinstonLog.ServiceDeleted, {
                executorId,
            }
        )
    }
}