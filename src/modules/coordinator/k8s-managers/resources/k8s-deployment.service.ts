import { Inject, Injectable, Scope } from "@nestjs/common"
import { REQUEST } from "@nestjs/core"
import { createReadinessWatcherName, ReadinessWatcherFactoryService } from "@modules/mixin"
import { envConfig, K8SRecreateStrategy } from "@modules/env"
import { InjectKubernetesApi } from "@modules/kubernetes"
import { AppsV1Api } from "@kubernetes/client-node"
import { creatExecutorName } from "../../utils"
import { AsyncService, DayjsService } from "@modules/mixin"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { PatchOperation } from "../../types"

// DeploymentManagerService is responsible for ensuring that an executor Deployment
// exists and is running for a given executorId.
//
// Responsibilities:
// - Create the Deployment if it does not exist
// - Trigger a rolling restart if the Deployment already exists
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
export class DeploymentManagerService  {
    constructor(
        // The request object injected into this processor. It contains
        // the `user` instance for whom the processor is running.
        @Inject(REQUEST)
        private readonly request: DeploymentManagerRequest,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        @InjectKubernetesApi()
        private readonly kubernetesApi: AppsV1Api,
        private readonly asyncService: AsyncService,
        @InjectWinston()
        private readonly winstonLogger: WinstonLogger,
        private readonly dayjsService: DayjsService,
    ) {}

    // Register event listeners for this processor instance.
    // This lets every user have their own isolated event handling logic.
    async initialize() {
        this.readinessWatcherFactoryService.createWatcher(
            createReadinessWatcherName(
                DeploymentManagerService.name, 
                {
                    executorId: this.request.executorId,
                }
            ))
        // we check if the deployment already exists
        const [deployment] = await this.asyncService.resolveTuple(
            this.kubernetesApi.readNamespacedDeployment({
                name: creatExecutorName(this.request.executorId),
                namespace: envConfig().kubernetes.podNamespace,
            })
        )
        if (!deployment) {
            await this.createDeployment()
            this.winstonLogger.verbose(
                WinstonLog.DeploymentCreated, {
                    executorId: this.request.executorId,
                })
            return
        } 
        else if 
        (
            envConfig().k8s.kaniExecutor.recreate === K8SRecreateStrategy.Patch
        ) {
            const patchBody: Array<PatchOperation> = [
                {
                    op: "replace",
                    path: "/spec/template/metadata/annotations/kubectl.kubernetes.io~1patchedAt",
                    value: this.dayjsService.now().toISOString(),
                }
            ] 
            await this.kubernetesApi.patchNamespacedDeployment({
                name: creatExecutorName(this.request.executorId),
                namespace: envConfig().kubernetes.podNamespace,
                body: patchBody,
            }
            )
            this.winstonLogger.verbose(
                WinstonLog.DeploymentPatched, {
                    executorId: this.request.executorId,
                })
            return
        } 
        else if (
            envConfig().k8s.kaniExecutor.recreate === K8SRecreateStrategy.Recreate
        ) {
            await this.kubernetesApi.deleteNamespacedDeployment({
                name: creatExecutorName(this.request.executorId),
                namespace: envConfig().kubernetes.podNamespace,
            })
            await this.createDeployment()
            this.winstonLogger.verbose(
                WinstonLog.DeploymentRecreated, {
                    executorId: this.request.executorId,
                })
            return
        }
    }

    private async createDeployment() {
        const name = creatExecutorName(this.request.executorId)
        // we create the deployment
        await this.kubernetesApi.createNamespacedDeployment({
            namespace: envConfig().kubernetes.podNamespace,
            body: {
                metadata: {
                    name,
                    namespace: envConfig().kubernetes.podNamespace,
                },
                spec: {
                    selector: {
                        matchLabels: {
                            "app.kubernetes.io/instance": name,
                            "app.kubernetes.io/name": "service",
                        },
                    }, 
                    template: {
                        metadata: {
                            labels: {
                                "app.kubernetes.io/component": "service",
                                "app.kubernetes.io/instance": name,
                                "app.kubernetes.io/name": "service",
                            },
                            annotations: {
                                "kubectl.kubernetes.io/patchedAt": new Date().toISOString(),
                            },
                        },
                        spec: {
                            affinity: {
                                podAntiAffinity: {
                                    preferredDuringSchedulingIgnoredDuringExecution: [
                                        {
                                            podAffinityTerm: {
                                                labelSelector: {
                                                    matchLabels: {
                                                        "app.kubernetes.io/instance": name,
                                                        "app.kubernetes.io/name": "service",
                                                    },
                                                },
                                                topologyKey: "kubernetes.io/hostname",
                                            },
                                            weight: 1,
                                        },
                                    ],
                                },
                            },
                            containers: [
                                {
                                    name: creatExecutorName(this.request.executorId),
                                    image: envConfig().k8s.kaniExecutor.image,
                                    env: [
                                        {
                                            name: "POD_NAME",
                                            valueFrom: {
                                                fieldRef: {
                                                    apiVersion: "v1",
                                                    fieldPath: "metadata.name",
                                                },
                                            },
                                        },
                                        {
                                            name: "POD_NAMESPACE",
                                            value: envConfig().kubernetes.podNamespace,
                                        },
                                        {
                                            name: "EXECUTOR_ID",
                                            value: this.request.executorId,
                                        },
                                    ],
                                    envFrom: [
                                        {
                                            configMapRef: {
                                                name: envConfig().k8s.kaniExecutor.envVarsConfigMapName,
                                            }
                                        },
                                        {
                                            secretRef: {
                                                name: envConfig().k8s.kaniExecutor.envVarsSecretName,
                                            }
                                        }
                                    ],
                                    livenessProbe: {
                                        failureThreshold: envConfig().k8s.kaniExecutor.probes.liveness.failureThreshold,
                                        httpGet: {
                                            path: envConfig().k8s.kaniExecutor.probes.liveness.httpGet.path,
                                            port: envConfig().k8s.kaniExecutor.probes.liveness.httpGet.port,
                                            scheme: envConfig().k8s.kaniExecutor.probes.liveness.httpGet.scheme,
                                        },
                                        initialDelaySeconds: envConfig().k8s.kaniExecutor.probes.liveness.initialDelaySeconds,
                                        periodSeconds: envConfig().k8s.kaniExecutor.probes.liveness.periodSeconds,
                                        successThreshold: envConfig().k8s.kaniExecutor.probes.liveness.successThreshold,
                                        timeoutSeconds: envConfig().k8s.kaniExecutor.probes.liveness.timeoutSeconds,
                                    },
                                    readinessProbe: {
                                        failureThreshold: envConfig().k8s.kaniExecutor.probes.readiness.failureThreshold,
                                        httpGet: {
                                            path: envConfig().k8s.kaniExecutor.probes.readiness.httpGet.path,
                                            port: envConfig().k8s.kaniExecutor.probes.readiness.httpGet.port,
                                            scheme: envConfig().k8s.kaniExecutor.probes.readiness.httpGet.scheme,
                                        },
                                        initialDelaySeconds: envConfig().k8s.kaniExecutor.probes.readiness.initialDelaySeconds,
                                        periodSeconds: envConfig().k8s.kaniExecutor.probes.readiness.periodSeconds,
                                        successThreshold: envConfig().k8s.kaniExecutor.probes.readiness.successThreshold,
                                        timeoutSeconds: envConfig().k8s.kaniExecutor.probes.readiness.timeoutSeconds,
                                    },
                                    startupProbe: {
                                        failureThreshold: envConfig().k8s.kaniExecutor.probes.startup.failureThreshold,
                                        httpGet: {
                                            path: envConfig().k8s.kaniExecutor.probes.startup.httpGet.path,
                                            port: envConfig().k8s.kaniExecutor.probes.startup.httpGet.port,
                                            scheme: envConfig().k8s.kaniExecutor.probes.startup.httpGet.scheme,
                                        },
                                        initialDelaySeconds: envConfig().k8s.kaniExecutor.probes.startup.initialDelaySeconds,
                                        periodSeconds: envConfig().k8s.kaniExecutor.probes.startup.periodSeconds,
                                        successThreshold: envConfig().k8s.kaniExecutor.probes.startup.successThreshold,
                                        timeoutSeconds: envConfig().k8s.kaniExecutor.probes.startup.timeoutSeconds,
                                    },
                                    ports: [
                                        {
                                            containerPort: envConfig().ports.kaniExecutor,
                                            name: "app",
                                            protocol: "TCP",
                                        },
                                    ],
                                    resources: {
                                        limits: {
                                            cpu: envConfig().k8s.kaniExecutor.resources.limits.cpu,
                                            memory: envConfig().k8s.kaniExecutor.resources.limits.memory,
                                        },
                                        requests: {
                                            cpu: envConfig().k8s.kaniExecutor.resources.requests.cpu,
                                            memory: envConfig().k8s.kaniExecutor.resources.requests.memory,
                                        },
                                    },
                                    securityContext: {
                                        allowPrivilegeEscalation: false,
                                        capabilities: {
                                            drop: ["ALL"],
                                        },
                                        privileged: false,
                                        readOnlyRootFilesystem: true,
                                        runAsGroup: 1001,
                                        runAsNonRoot: true,
                                        runAsUser: 1001,
                                        seccompProfile: {
                                            type: "RuntimeDefault",
                                        },
                                    },
                                    volumeMounts: [
                                        {
                                            mountPath: envConfig().mountPath.keys.aes.replace(/\/data$/, ""),
                                            name: "aes",
                                            readOnly: true
                                        },
                                        {
                                            mountPath: envConfig().mountPath.gcp.cryptoKeyEdSa.replace(/\/data$/, ""),
                                            name: "crypto-key-ed-sa",
                                            readOnly: true
                                        },
                                        {
                                            mountPath: envConfig().mountPath.keys.jwtSecret.replace(/\/data$/, ""),
                                            name: "jwt-secret",
                                            readOnly: true
                                        },
                                        {
                                            mountPath: envConfig().mountPath.config.smtp.replace(/\/data$/, ""),
                                            name: "smtp",
                                            readOnly: true
                                        },
                                        {
                                            mountPath: envConfig().mountPath.config.apiKeys.replace(/\/data$/, ""),
                                            name: "api-keys",
                                            readOnly: true
                                        },
                                        {
                                            mountPath: envConfig().mountPath.config.rpcs.replace(/\/data$/, ""),
                                            name: "rpcs",
                                            readOnly: true
                                        },

                                    ],
                                },
                            ],
                            nodeSelector: {
                                "doks.digitalocean.com/node-pool": envConfig().k8s.kaniExecutor.nodePool,
                            },
                            securityContext: {
                                fsGroup: 1001,
                                fsGroupChangePolicy: "Always",
                            },
                            volumes: [
                                {
                                    name: "aes",
                                    secret: {
                                        secretName: "aes",
                                    },
                                },
                                {
                                    name: "crypto-key-ed-sa",
                                    secret: {
                                        secretName: "crypto-key-ed-sa",
                                    },
                                },
                                {
                                    name: "jwt-secret",
                                    secret: {
                                        secretName: "jwt-secret",
                                    },
                                },
                                {
                                    name: "smtp",
                                    secret: {
                                        secretName: "smtp",
                                    },
                                },  
                                {
                                    name: "api-keys",
                                    secret: {
                                        secretName: "api-keys",
                                    },
                                },
                                {
                                    name: "rpcs",
                                    secret: {
                                        secretName: "rpcs",
                                    },
                                },
                            ],
                        },
                    },
                },
            },
        })
    }
}

export interface DeploymentManagerRequest {
    executorId: string
}