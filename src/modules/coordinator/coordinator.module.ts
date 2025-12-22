
import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./coordinator.module-definition"
import { LoadersModule } from "./loaders"
import { K8sResourseManagersModule } from "./k8s-managers"

@Module({
    imports: [
        LoadersModule.register({
            isGlobal: true,
        }),
        K8sResourseManagersModule.register({
            isGlobal: true,
        }),
    ],
})
export class CoordinatorModule extends ConfigurableModuleClass {}
