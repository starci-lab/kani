import {
    runInKubernetes
} from "@modules/env/utils"
import type {
    BotSchema
} from "@modules/databases"
import {
    envConfig
} from "@modules/env"

/**
 * Build executor service endpoint based on runtime environment.
 *
 * - In Kubernetes: resolve executor by its Pod DNS name inside the cluster
 * - In local/dev: fallback to localhost using configured port
 */
export const buildExecutorEndpoint = (bot: BotSchema) => {
    if (runInKubernetes()) {
        const executorId = bot.executor.toString()
        return `http://kani-executor-${executorId}.${envConfig().k8s.global.podNamespace}.svc.cluster.local:3000`
    }
    return `http://localhost:${envConfig().ports.kaniExecutor}`
}



/** Build executor endpoint path from tags and api. */
export const buildExecutorEndpointPath = (tags: string, api: string) =>
    `${tags}/${api}`

/** Params for building full executor endpoint path. */
export interface BuildExecutorFullEndpointPathParams {
    tags: string
    api: string
    bot: BotSchema
}

/** Build full executor endpoint URL (base + /api/ + path). */
export const buildExecutorFullEndpointPath = ({
    tags,
    api,
    bot,
}: BuildExecutorFullEndpointPathParams) =>
    `${buildExecutorEndpoint(bot)}/api/${buildExecutorEndpointPath(tags,
        api)}`
