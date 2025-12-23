import { DynamicModule, Module, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./k8s-resourse-managers.module-definition"
import { K8sManagerFactoryService } from "./k8s-manager-factory.service"
import { DeploymentManagerService, ServiceManagerService } from "./resources"
import { MetadataManagerService } from "./metadata"

@Module({})
export class K8sResourseManagersModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            K8sManagerFactoryService,
            DeploymentManagerService,
            MetadataManagerService,
            ServiceManagerService,
        ]
        return {
            ...dynamicModule,
            providers: [...dynamicModule.providers || [], ...providers],
            exports: [...providers],
        }
    }
}   