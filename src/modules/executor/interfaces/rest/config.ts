import {
    runInKubernetes 
} from "@modules/env/utils"
import {
    BotSchema 
} from "@modules/databases"
import {
    envConfig 
} from "@modules/env"
/**
 * Build executor service endpoint based on runtime environment.
 *
 * - In Kubernetes: resolve executor by its Pod DNS name inside the cluster
 *   (kani-executor-{executorId}.{namespace}.svc.cluster.local:3000)
 * - In local/dev: fallback to localhost using configured port
 */
export const buildExecutorEndpoint = (bot: BotSchema) => {
    if (runInKubernetes()) {
        const executorId = bot.executor.toString()
        // Use Kubernetes internal DNS to reach the executor pod through the service name
        return `http://kani-executor-${executorId}.${envConfig().k8s.executor.podNamespace}.svc.cluster.local:3000`
    }
    // Local development endpoint
    return `http://localhost:${envConfig().ports.kaniExecutor}`
}

export const restConfig = () => ({
    jobs: () => ({
        tags: "jobs",
        api: () => ({
            addWithdrawJob: {
                path: "add-withdraw-job",
            }
        })
    })
})

export const buildExecutorEndpointPath = (tags: string, api: string) => {
    return `${tags}/${api}`
}

export const buildExecutorFullEndpointPath = ({ tags, api, bot }: BuildExecutorFullEndpointPathParams) => {
    return `${buildExecutorEndpoint(bot)}/api/${buildExecutorEndpointPath(tags,
        api)}`
}

export interface BuildExecutorFullEndpointPathParams {
    tags: string
    api: string
    bot: BotSchema
}