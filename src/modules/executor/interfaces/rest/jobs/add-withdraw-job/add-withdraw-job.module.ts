import {
    DynamicModule, Module, Provider,
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE,
} from "./add-withdraw-job.module-definition"
import {
    AddWithdrawJobController,
} from "./add-withdraw-job.controller"
import {
    AddWithdrawJobService,
} from "./add-withdraw-job.service"

@Module({
})
export class AddWithdrawJobModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE,
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            AddWithdrawJobService,
        ]
        const controllers = [
            AddWithdrawJobController,
        ]
        return {
            ...dynamicModule,
            controllers,
            providers: [...dynamicModule.providers || [],
                ...providers],
            exports: [...providers],
        }
    }
}
