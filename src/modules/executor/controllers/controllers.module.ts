import {
    DynamicModule, Module, Provider 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./controllers.module-definition"
import {
    BotsLoaderService 
} from "./bots-loader.service"
import {
    ExecutorLoaderService 
} from "./executor-loader.service"

@Module({
})
export class LoadersModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            ExecutorLoaderService,
            BotsLoaderService,
        ]
        return {
            ...dynamicModule,
            providers: [...dynamicModule.providers || [],
                ...providers],
            exports: [...providers],
        }
    }
}   