import { DynamicModule, Module, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./dexes.module-definition"
import { DexesFetcherService } from "./fetchers.service"

@Module({})
export class DexesModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const imports: Array<DynamicModule> = []
        const providers: Array<Provider> = [
            DexesFetcherService
        ]
        return {
            ...dynamicModule,
            imports,
            providers: [...dynamicModule.providers || [], ...providers],
            exports: [...providers],
        }
    }
}   