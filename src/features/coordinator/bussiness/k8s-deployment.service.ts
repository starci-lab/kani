import {
    Injectable 
} from "@nestjs/common"
import {
    envConfig 
} from "@modules/env"
import {
    InjectKubernetesApi 
} from "@modules/kubernetes"
import {
    AppsV1Api 
} from "@kubernetes/client-node"
import {
    createExecutorName 
} from "../utils"
import {
    AsyncService, DayjsService 
} from "@modules/mixin"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import type {
    PatchOperation 
} from "../types"
import {
    K8SLabelsService 
} from "./k8s-labels.service"
import {
    K8SAnnotationKey, K8SAnnotationsService 
} from "./k8s-annotations.service"
import type {
    GetDeploymentParams,
    GetDeploymentResult,
    CreateDeploymentParams,
    CreateDeploymentResult,
    PatchDeploymentParams,
    PatchDeploymentResult,
    DeleteDeploymentParams,
    DeleteDeploymentResult
} from "../types"

const escapeJsonPointerSegment = (value: string): string => {
    return value.replace(/~/g,
        "~0").replace(/\//g,
        "~1")
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
        private readonly winstonService: WinstonService,
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
     * @param param - Parameters for getting deployment
     * @returns Promise that resolves with the Deployment object
     * @throws Error if the Deployment retrieval fails or the Deployment doesn't exist
     *
     * @example
     * const deployment = await service.getDeployment({ executor })
     */
    public async getDeployment({ executor }: GetDeploymentParams): Promise<GetDeploymentResult> {
        // create deployment name from executor ID
        const name = createExecutorName(executor.id)
        
        // retrieve deployment from Kubernetes
        const [deployment] = await this.asyncService.resolveTuple(
            this.kubernetesApi.readNamespacedDeployment(
                {
                    name,
                    namespace: envConfig().k8s.global.podNamespace,
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
     * @param param - Parameters for creating deployment
     * @returns Promise that resolves when the Deployment is created
     * @throws Error if the Deployment creation fails
     *
     * @example
     * await service.createDeployment({ executor })
     */
    public async createDeployment({ executor }: CreateDeploymentParams): Promise<CreateDeploymentResult> {
        // create deployment name from executor ID
        const name = createExecutorName(executor.id)
    
        // get stable selector labels (MUST NOT CHANGE)
        const selector = this.k8sLabelsService.getSelector({
            executor
        })
    
        // get metadata labels (can evolve), but MUST include selector keys
        const labels = {
            ...this.k8sLabelsService.getLabels({
                executor
            }),
            ...selector,
        }
    
        // get annotations
        const annotations = this.k8sAnnotationsService.getAnnotations({
            executor
        })
    
        await this.kubernetesApi.createNamespacedDeployment({
            namespace: envConfig().k8s.global.podNamespace,
            body: {
                metadata: {
                    name,
                    namespace: envConfig().k8s.global.podNamespace,
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
                                    image: envConfig().k8s.executor.image,
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
                                            value: envConfig().k8s.global.podNamespace,
                                        },
                                        {
                                            name: "EXECUTOR_ID",
                                            value: executor.id,
                                        },
                                    ],
                                    envFrom: [
                                        {
                                            configMapRef: {
                                                name: envConfig().k8s.executor.envVarsConfigMapName,
                                            }
                                        },
                                        {
                                            secretRef: {
                                                name: envConfig().k8s.executor.envVarsSecretName,
                                            }
                                        }
                                    ],
                                    livenessProbe: {
                                        failureThreshold: envConfig().k8s.executor.probes.liveness.failureThreshold,
                                        httpGet: {
                                            path: envConfig().k8s.executor.probes.liveness.httpGet.path,
                                            port: envConfig().k8s.executor.probes.liveness.httpGet.port,
                                            scheme: envConfig().k8s.executor.probes.liveness.httpGet.scheme,
                                        },
                                        initialDelaySeconds: envConfig().k8s.executor.probes.liveness.initialDelaySeconds,
                                        periodSeconds: envConfig().k8s.executor.probes.liveness.periodSeconds,
                                        successThreshold: envConfig().k8s.executor.probes.liveness.successThreshold,
                                        timeoutSeconds: envConfig().k8s.executor.probes.liveness.timeoutSeconds,
                                    },
                                    readinessProbe: {
                                        failureThreshold: envConfig().k8s.executor.probes.readiness.failureThreshold,
                                        httpGet: {
                                            path: envConfig().k8s.executor.probes.readiness.httpGet.path,
                                            port: envConfig().k8s.executor.probes.readiness.httpGet.port,
                                            scheme: envConfig().k8s.executor.probes.readiness.httpGet.scheme,
                                        },
                                        initialDelaySeconds: envConfig().k8s.executor.probes.readiness.initialDelaySeconds,
                                        periodSeconds: envConfig().k8s.executor.probes.readiness.periodSeconds,
                                        successThreshold: envConfig().k8s.executor.probes.readiness.successThreshold,
                                        timeoutSeconds: envConfig().k8s.executor.probes.readiness.timeoutSeconds,
                                    },
                                    startupProbe: {
                                        failureThreshold: envConfig().k8s.executor.probes.startup.failureThreshold,
                                        httpGet: {
                                            path: envConfig().k8s.executor.probes.startup.httpGet.path,
                                            port: envConfig().k8s.executor.probes.startup.httpGet.port,
                                            scheme: envConfig().k8s.executor.probes.startup.httpGet.scheme,
                                        },
                                        initialDelaySeconds: envConfig().k8s.executor.probes.startup.initialDelaySeconds,
                                        periodSeconds: envConfig().k8s.executor.probes.startup.periodSeconds,
                                        successThreshold: envConfig().k8s.executor.probes.startup.successThreshold,
                                        timeoutSeconds: envConfig().k8s.executor.probes.startup.timeoutSeconds,
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
                                            cpu: envConfig().k8s.executor.resources.limits.cpu,
                                            memory: envConfig().k8s.executor.resources.limits.memory,
                                        },
                                        requests: {
                                            cpu: envConfig().k8s.executor.resources.requests.cpu,
                                            memory: envConfig().k8s.executor.resources.requests.memory,
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
                                            mountPath: envConfig().mountPath.terraform.gcpCloudKmsCryptoOperatorSa.replace(/\/data$/,
                                                ""),
                                            name: "gcp-cloud-kms-crypto-operator-sa",
                                            readOnly: true
                                        },
                                        {
                                            mountPath: envConfig().mountPath.terraform.gcpCryptoKeyEdSa.replace(/\/data$/,
                                                ""),
                                            name: "gcp-crypto-key-ed-sa",
                                            readOnly: true
                                        },
                                        {
                                            mountPath: envConfig().mountPath.terraform.gcpGoogleDriveUdSa.replace(/\/data$/,
                                                ""),
                                            name: "gcp-google-drive-ud-sa",
                                            readOnly: true
                                        },
                                        {
                                            mountPath: envConfig().mountPath.terraform.encryptedAesKey.replace(/\/data$/,
                                                ""),
                                            name: "encrypted-aes-key",
                                            readOnly: true
                                        },
                                        {
                                            mountPath: envConfig().mountPath.terraform.privySignerPrivateKey.replace(/\/data$/,
                                                ""),
                                            name: "privy-signer-private-key",
                                            readOnly: true
                                        },
                                        {
                                            mountPath: envConfig().mountPath.terraform.privyAppSecretKey.replace(/\/data$/,
                                                ""),
                                            name: "privy-app-secret-key",
                                            readOnly: true
                                        },
                                        {
                                            mountPath: envConfig().mountPath.terraform.coinMarketCapApiKey.replace(/\/data$/,
                                                ""),
                                            name: "coin-market-cap-api-key",
                                            readOnly: true
                                        },
                                        {
                                            mountPath: envConfig().mountPath.terraform.encryptedJwtSecretKey.replace(/\/data$/,
                                                ""),
                                            name: "encrypted-jwt-secret-key",
                                            readOnly: true
                                        },
                                        // config
                                        {
                                            mountPath: envConfig().mountPath.config.app.replace(/\/data$/,
                                                ""),
                                            name: "app",
                                            readOnly: true
                                        },
                                        {
                                            mountPath: envConfig().mountPath.config.rpcs.replace(/\/data$/,
                                                ""),
                                            name: "rpcs",
                                            readOnly: true
                                        },
                                    ],
                                },
                            ],
                            nodeSelector: {
                                "doks.digitalocean.com/node-pool": envConfig().k8s.executor.nodePool,
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
                                    name: "privy-signer-private-key",
                                    secret: {
                                        secretName: "privy-signer-private-key",
                                    },
                                },
                                {
                                    name: "privy-app-secret-key",
                                    secret: {
                                        secretName: "privy-app-secret-key",
                                    },
                                },
                                {
                                    name: "coin-market-cap-api-key",
                                    secret: {
                                        secretName: "coin-market-cap-api-key",
                                    },
                                },
                                {
                                    name: "encrypted-aes-key",
                                    secret: {
                                        secretName: "encrypted-aes-key",
                                    },
                                },
                                {
                                    name: "encrypted-jwt-secret-key",
                                    secret: {
                                        secretName: "encrypted-jwt-secret-key",
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
        
        // log deployment creation
        this.winstonService.log(
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
     * @param param - Parameters for patching deployment
     * @returns Promise that resolves when deployment is patched
     *
     * @example
     * await service.patchDeployment({ executor })
     */
    public async patchDeployment({ executor }: PatchDeploymentParams): Promise<PatchDeploymentResult> {
        // create deployment name from executor ID
        const name = createExecutorName(executor.id)
        
        // escape JSON pointer segment for patch path
        const patchAtJsonPointer = escapeJsonPointerSegment(K8SAnnotationKey.PatchAt)
        
        // build patch body
        const patchBody: Array<PatchOperation> = [
            {
                op: "replace",
                path: `/spec/template/metadata/annotations/${patchAtJsonPointer}`,
                value: this.dayjsService.now().toISOString(),
            }
        ]
        
        // apply patch to deployment
        await this.kubernetesApi.patchNamespacedDeployment({
            name,
            namespace: envConfig().k8s.global.podNamespace,
            body: patchBody,
        }
        )
        
        // log deployment patch
        this.winstonService.log(
            WinstonLog.DeploymentPatched,
            {
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
     * @param param - Parameters for deleting deployment
     * @returns Promise that resolves when deployment is deleted
     *
     * @example
     * await service.deleteDeployment({ executorId })
     */
    public async deleteDeployment({ executorId }: DeleteDeploymentParams): Promise<DeleteDeploymentResult> {
        // create deployment name from executor ID
        const name = createExecutorName(executorId)
        
        // delete deployment from Kubernetes
        await this.kubernetesApi.deleteNamespacedDeployment(
            {
                name,
                namespace: envConfig().k8s.global.podNamespace,
            }
        )
        
        // log deployment deletion
        this.winstonService.log(
            WinstonLog.DeploymentDeleted,
            {
                executorId,
            }
        )
    }
}
