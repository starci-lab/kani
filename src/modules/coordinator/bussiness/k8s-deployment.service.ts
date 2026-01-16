import { Injectable } from "@nestjs/common"
import { envConfig } from "@modules/env"
import { InjectKubernetesApi } from "@modules/kubernetes"
import { AppsV1Api } from "@kubernetes/client-node"
import { createExecutorName } from "../utils"
import { AsyncService, DayjsService } from "@modules/mixin"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { PatchOperation } from "../types"
import { K8SLabelsService } from "./k8s-labels.service"
import { ExecutorSchema } from "@modules/databases"
import { K8SAnnotationKey, K8SAnnotationsService } from "./k8s-annotations.service"

const escapeJsonPointerSegment = (value: string): string => {
    return value.replace(/~/g, "~0").replace(/\//g, "~1")
}

/**
 * Manages Kubernetes `Deployment` resources for executor instances.
 *
 * Responsibilities:
 * - Read a Deployment by executor
 * - Create a Deployment for an executor
 * - Patch a Deployment template annotation to trigger a rollout
 * - Delete a Deployment for an executor
 */
@Injectable()
export class K8SDeploymentService  {
    constructor(
        @InjectKubernetesApi()
        private readonly kubernetesApi: AppsV1Api,
        @InjectWinston()
        private readonly winstonLogger: WinstonLogger,
        private readonly dayjsService: DayjsService,
        private readonly asyncService: AsyncService,
        private readonly k8sLabelsService: K8SLabelsService,
        private readonly k8sAnnotationsService: K8SAnnotationsService,
    ) {}
    /**
     * Gets a Kubernetes Deployment for an executor.
     * 
     * This method retrieves the Deployment resource from Kubernetes by name.
     * 
     * @param executor - The executor schema
     * @returns Promise that resolves with the Deployment object
     * @throws Error if the Deployment retrieval fails or the Deployment doesn't exist
     */
    public async getDeployment(executor: ExecutorSchema) {
        const name = createExecutorName(executor.id)
        const [deployment] = await this.asyncService.resolveTuple(
            this.kubernetesApi.readNamespacedDeployment(
                {
                    name,
                    namespace: envConfig().kubernetes.podNamespace,
                }
            )
        )
        return deployment
    }

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
     * @param executor - The executor schema
     * @returns Promise that resolves when the Deployment is created
     * @throws Error if the Deployment creation fails
     */
    public async createDeployment(executor: ExecutorSchema) {
        const name = createExecutorName(executor.id)
    
        // Stable selector labels (MUST NOT CHANGE)
        const selector = this.k8sLabelsService.getSelector(executor)
    
        // Metadata labels (can evolve), but MUST include selector keys.
        const labels = {
            ...this.k8sLabelsService.getLabels(executor),
            ...selector,
        }
    
        const annotations = this.k8sAnnotationsService.getAnnotations(executor)
    
        await this.kubernetesApi.createNamespacedDeployment({
            namespace: envConfig().kubernetes.podNamespace,
            body: {
                metadata: {
                    name,
                    namespace: envConfig().kubernetes.podNamespace,
                    labels,
                    annotations,
                },
                spec: {
                    selector: {
                        matchLabels: selector,
                    },
                    template: {
                        metadata: {
                            // Pod labels must contain selector labels to satisfy `spec.selector.matchLabels`.
                            labels,
                            annotations,
                        },
                        spec: {
                            affinity: {
                                podAntiAffinity: {
                                    preferredDuringSchedulingIgnoredDuringExecution: [
                                        {
                                            podAffinityTerm: {
                                                labelSelector: {
                                                    matchLabels: selector,
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
                                            value: executor.id,
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
                executorId: executor.id,
            }
        )
    }

    /**
     * Trigger a rolling restart by updating an annotation under `spec.template`.
     *
     * Kubernetes creates a new ReplicaSet whenever `spec.template` changes. We patch
     * `spec.template.metadata.annotations["kanibot.xyz/patch-at"]` with a new timestamp.
     *
     * Note: this uses JSON Patch `replace`, so the annotation key must already exist.
     * It is seeded at creation time via `K8SAnnotationsService.getAnnotations()`.
     *
     * @param executor - executor schema
     */
    public async patchDeployment(executor: ExecutorSchema) {
        // create the deployment name
        const name = createExecutorName(executor.id)
        const patchAtJsonPointer = escapeJsonPointerSegment(K8SAnnotationKey.PatchAt)
        // we patch the deployment
        const patchBody: Array<PatchOperation> = [
            {
                op: "replace",
                path: `/spec/template/metadata/annotations/${patchAtJsonPointer}`,
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
            WinstonLog.DeploymentPatched, {
                executorId: executor.id,
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
     * @param executor - executor schema
     */
    public async deleteDeployment(executor: ExecutorSchema) {
        // create the deployment name
        const name = createExecutorName(executor.id)
        // we delete the deployment
        await this.kubernetesApi.deleteNamespacedDeployment(
            {
                name,
                namespace: envConfig().kubernetes.podNamespace,
            }
        )
        this.winstonLogger.verbose(
            WinstonLog.DeploymentDeleted, {
                executorId: executor.id,
            }
        )
    }
}

export interface K8SDeploymentServiceRequest {
    executor: ExecutorSchema
}