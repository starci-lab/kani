import { DynamicModule, Module, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./kubernetes.module-definition"
import { createKubernetesApiProvider, createKubernetesClientProvider } from "./kubernetes.providers"
    
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
        ]
        return {
            ...dynamicModule,
            providers: [...dynamicModule.providers || [], ...providers],
            exports: [...providers],
        }
    }
}