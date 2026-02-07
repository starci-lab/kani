import {
    Injectable 
} from "@nestjs/common"
import {
    DayjsService 
} from "@modules/mixin"
import {
    envConfig 
} from "@modules/env"
import type {
    GetAnnotationsParams
} from "../types"

/**
 * Builds Kubernetes annotations for executor-related resources.
 *
 * Use these annotations for:
 * - Traceability / auditing
 * - Debugging
 * - Version metadata
 *
 * IMPORTANT: annotations are NOT safe for label selectors / routing.
 */
@Injectable()
export class K8SAnnotationsService {
    constructor(
        private readonly dayjsService: DayjsService,
    ) {}

    /**
     * Build Kubernetes annotations for an executor resource.
     *
     * Note: all values MUST be strings per Kubernetes annotation rules.
     *
     * @param param - Parameters for getting annotations
     * @returns The annotations
     *
     * @example
     * const annotations = await service.getAnnotations({ executor })
     */
    public getAnnotations({ executor }: GetAnnotationsParams): Record<K8SAnnotationKey, string> {
        // get current timestamp
        const nowIso = this.dayjsService.now().toISOString()
        
        // build annotations object
        return {
            [K8SAnnotationKey.ExecutorId]: String(executor.id),
            [K8SAnnotationKey.ExecutorVersion]: String(executor.version ?? "unknown"),
            [K8SAnnotationKey.CreatedBy]: "coordinator",
            [K8SAnnotationKey.CreatedAt]: nowIso,
            [K8SAnnotationKey.CoordinatorVersion]: String(envConfig().coordinator.version ?? "unknown"),
            // Rollout trigger timestamp; `patchDeployment()` updates this to force a new ReplicaSet.
            [K8SAnnotationKey.PatchAt]: nowIso,
        }
    }
}

/**
 * Canonical Kubernetes annotation keys used on executor resources.
 *
 * Values are the full annotation keys (including the `kanibot.xyz/` prefix).
 */
export enum K8SAnnotationKey {
    ExecutorId = "kanibot.xyz/executor-id",
    ExecutorVersion = "kanibot.xyz/executor-version",
    CreatedBy = "kanibot.xyz/created-by",
    CreatedAt = "kanibot.xyz/created-at",
    CoordinatorVersion = "kanibot.xyz/coordinator-version",
    PatchAt = "kanibot.xyz/patch-at",
}