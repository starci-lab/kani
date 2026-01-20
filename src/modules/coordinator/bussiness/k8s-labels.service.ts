import {
    Injectable 
} from "@nestjs/common"
import {
    ExecutorSchema 
} from "@modules/databases"
import {
    createExecutorName 
} from "../utils"

/**
 * Builds Kubernetes labels and selectors for executor-related resources.
 *
 * Labels generated here are intended to:
 * - Identify executor resources
 * - Group related Kubernetes objects
 * - Be safe for selectors and routing
 *
 * All labels follow the Kubernetes recommended label conventions:
 * https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/
 */
@Injectable()
export class K8SLabelsService {
    
    /**
     * Build the stable selector labels for an executor.
     *
     * IMPORTANT: selector labels MUST be stable over time, otherwise Kubernetes
     * Services and Deployments may stop matching their Pods.
     */
    public getSelector(
        executor: ExecutorSchema
    ): Record<K8SLabelKey.Instance | K8SLabelKey.Name, string> {
        return {
            [K8SLabelKey.Instance]: createExecutorName(executor.id),
            [K8SLabelKey.Name]: "executor",
        }
    }

    /**
     * Metadata labels applied to Kubernetes resources.
     *
     * These labels may evolve over time but MUST always
     * include all selector labels.
     */
    public getLabels(
        executor: ExecutorSchema
    ): Record<K8SLabelKey, string> {
        return {
            ...this.getSelector(executor),
            [K8SLabelKey.Component]: "service",
        }
    }
}

/**
 * Canonical Kubernetes label keys used on executor resources.
 *
 * Values are the full label keys (including the `app.kubernetes.io/` prefix).
 */
export enum K8SLabelKey {
    Instance = "app.kubernetes.io/instance",
    Name = "app.kubernetes.io/name",
    Component = "app.kubernetes.io/component",
}
