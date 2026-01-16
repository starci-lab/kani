import { Injectable } from "@nestjs/common"
import { envConfig } from "@modules/env"
import { InjectKubernetesApi } from "@modules/kubernetes"
import { AppsV1Api } from "@kubernetes/client-node"
import { createExecutorName } from "../utils"
import { DayjsService } from "@modules/mixin"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { PatchOperation } from "../types"

// K8SDeploymentService is responsible for managing Kubernetes Deployments
// for executor instances.
//
// Responsibilities:
// - Create a new Deployment for an executor
// - Patch an existing Deployment to trigger a rolling restart
// - Delete a Deployment when an executor is removed
//
// This service handles the full lifecycle of executor Deployments in Kubernetes,
// ensuring that each executor has its own isolated Deployment with proper
// configuration, security settings, and resource constraints.
@Injectable()
export class K8SDeploymentService  {
    constructor(
        @InjectKubernetesApi()
        private readonly kubernetesApi: AppsV1Api,
        @InjectWinston()
        private readonly winstonLogger: WinstonLogger,
        private readonly dayjsService: DayjsService,
    ) {}

    /**
     * Creates a new Kubernetes Deployment for an executor.
     * 
     * This method creates a fully configured Deployment with:
     * - Pod anti-affinity rules to distribute pods across nodes
     * - Health probes (liveness, readiness, startup)
     * - Security context with non-root user and read-only filesystem
     * - Resource limits and requests
     * - Volume mounts for secrets and config maps
     * - Environment variables including the executor ID
     * 
     * @param executorId - The unique identifier of the executor
     * @returns Promise that resolves when the Deployment is created
     * @throws Error if the Deployment creation fails
     */
    public async createDeployment(executorId: string) {
        // create the deployment name
        const name = createExecutorName(executorId)
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
                                    name,
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
                                            value: executorId,
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
                                        // terraform
                                        {
                                            mountPath: envConfig().mountPath.terraform.gcpCloudKmsCryptoOperatorSa.replace(/\/data$/, ""),
                                            name: "gcp-cloud-kms-crypto-operator-sa",
                                            readOnly: true
                                        },
                                        {
                                            mountPath: envConfig().mountPath.terraform.gcpCryptoKeyEdSa.replace(/\/data$/, ""),
                                            name: "gcp-crypto-key-ed-sa",
                                            readOnly: true
                                        },
                                        {
                                            mountPath: envConfig().mountPath.terraform.gcpGoogleDriveUdSa.replace(/\/data$/, ""),
                                            name: "gcp-google-drive-ud-sa",
                                            readOnly: true
                                        },
                                        {
                                            mountPath: envConfig().mountPath.terraform.encryptedAesKey.replace(/\/data$/, ""),
                                            name: "aes",
                                            readOnly: true
                                        },
                                        {
                                            mountPath: envConfig().mountPath.terraform.encryptedJwtSecretKey.replace(/\/data$/, ""),
                                            name: "jwt-secret",
                                            readOnly: true
                                        },
                                        // config
                                        {
                                            mountPath: envConfig().mountPath.config.app.replace(/\/data$/, ""),
                                            name: "app",
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
                                // terraform
                                {
                                    name: "gcp-cloud-kms-crypto-operator-sa",
                                    secret: {
                                        secretName: "gcp-cloud-kms-crypto-operator-sa",
                                    },
                                },
                                {
                                    name: "gcp-crypto-key-ed-sa",
                                    secret: {
                                        secretName: "gcp-crypto-key-ed-sa",
                                    },
                                },
                                {
                                    name: "gcp-google-drive-ud-sa",
                                    secret: {
                                        secretName: "gcp-google-drive-ud-sa",
                                    },
                                },
                                {
                                    name: "aes",
                                    secret: {
                                        secretName: "aes",
                                    },
                                },
                                {
                                    name: "jwt-secret",
                                    secret: {
                                        secretName: "jwt-secret",
                                    },
                                },
                                // config
                                {
                                    name: "app",
                                    secret: {
                                        secretName: "app",
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
        this.winstonLogger.verbose(
            WinstonLog.DeploymentCreated, 
            {
                executorId,
            }
        )
    }

    /**
     * Patches an existing Kubernetes Deployment to trigger a rolling restart.
     * 
     * This method updates the `kubectl.kubernetes.io/patchedAt` annotation
     * with the current timestamp, which causes Kubernetes to perform a rolling
     * update of the pods in the Deployment. This is useful for restarting pods
     * without deleting the entire Deployment.
     * 
     * @param executorId - The unique identifier of the executor
     * @returns Promise that resolves when the Deployment is patched
     * @throws Error if the Deployment patch fails or the Deployment doesn't exist
     */
    public async patchDeployment(executorId: string) {
        // create the deployment name
        const name = createExecutorName(executorId)
        // we patch the deployment
        const patchBody: Array<PatchOperation> = [
            {
                op: "replace",
                path: "/spec/template/metadata/annotations/kubectl.kubernetes.io~1patchedAt",
                value: this.dayjsService.now().toISOString(),
            }
        ] 
        await this.kubernetesApi.patchNamespacedDeployment({
            name,
            namespace: envConfig().kubernetes.podNamespace,
            body: patchBody,
        }
        )
        this.winstonLogger.verbose(
            WinstonLog.DeploymentPatched, 
            {
                executorId,
            }
        )
    }

    /**
     * Deletes a Kubernetes Deployment for an executor.
     * 
     * This method removes the Deployment and all associated resources (pods, replicasets)
     * from the Kubernetes cluster. This is typically called when an executor is
     * removed or decommissioned.
     * 
     * @param executorId - The unique identifier of the executor
     * @returns Promise that resolves when the Deployment is deleted
     * @throws Error if the Deployment deletion fails or the Deployment doesn't exist
     */
    public async deleteDeployment(executorId: string) {
        // create the deployment name
        const name = createExecutorName(executorId)
        // we delete the deployment
        await this.kubernetesApi.deleteNamespacedDeployment(
            {
                name,
                namespace: envConfig().kubernetes.podNamespace,
            }
        )
        this.winstonLogger.verbose(
            WinstonLog.DeploymentDeleted, {
                executorId,
            }
        )
    }
}

export interface K8SDeploymentServiceRequest {
    executorId: string
}