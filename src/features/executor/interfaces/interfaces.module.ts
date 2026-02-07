import {
    DynamicModule, Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE,
} from "./interfaces.module-definition"
import {
    RestModule,
} from "./rest"

@Module({
})
export class InterfacesModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE,
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const modules: Array<DynamicModule> = [
            RestModule.register({
                isGlobal: true,
            }),
        ]
        return {
            ...dynamicModule,
            imports: [...modules],
        }
    }
}
