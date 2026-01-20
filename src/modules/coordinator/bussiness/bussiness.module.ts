import {
    DynamicModule, Module, Provider 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./bussiness.module-definition"
import {
    K8SDeploymentService 
} from "./k8s-deployment.service"
import {
    K8SServiceService 
} from "./k8s-service.service"
import {
    BootstrapResourceCleanupService 
} from "./bootstrap-resource-cleanup.service"
import {
    K8SAnnotationsService 
} from "./k8s-annotations.service"
import {
    K8SLabelsService 
} from "./k8s-labels.service"

@Module({
})
export class BussinessModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            K8SAnnotationsService,
            K8SLabelsService,
            K8SDeploymentService,
            K8SServiceService,
            BootstrapResourceCleanupService,
        ]
        return {
            ...dynamicModule,
            providers: [...dynamicModule.providers || [],
                ...providers],
            exports: [...providers],
        }
    }
}   