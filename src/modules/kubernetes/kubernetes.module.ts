import {
    DynamicModule,
    Module,
    Provider,
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
    OPTIONS_TYPE 
} from "./kubernetes.module-definition"
import {
    createKubernetesApiProvider,
    createKubernetesClientProvider,
    createKubernetesCoreApiProvider 
} from "./kubernetes.providers"

/**
 * Kubernetes Module
 * 
 * Provides Kubernetes API, client, and core API services.
 * 
 * @example
 * KubernetesModule.register({
 *   isGlobal: true,
 * })
 */
@Module({
})
export class KubernetesModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            createKubernetesApiProvider(),
            createKubernetesClientProvider(),
            createKubernetesCoreApiProvider(),
        ]
        return {
            ...dynamicModule,
            providers: [...dynamicModule.providers || [],
                ...providers],
            exports: [...providers],
        }
    }
}