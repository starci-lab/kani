import {
    DynamicModule, Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE,
} from "./rest.module-definition"
import {
    JobsModule,
} from "./jobs"

@Module({
})
export class RestModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE,
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const modules: Array<DynamicModule> = [
            JobsModule.register({
                isGlobal: true,
            }),
        ]
        return {
            ...dynamicModule,
            imports: [...modules],
        }
    }
}
