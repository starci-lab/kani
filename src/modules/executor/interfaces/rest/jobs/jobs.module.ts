import {
    DynamicModule, Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE,
} from "./jobs.module-definition"
import {
    AddWithdrawJobModule,
} from "./add-withdraw-job"

@Module({
})
export class JobsModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE,
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const modules: Array<DynamicModule> = [
            AddWithdrawJobModule.register({
                isGlobal: true,
            }),
        ]
        return {
            ...dynamicModule,
            imports: [...modules],
        }
    }
}
