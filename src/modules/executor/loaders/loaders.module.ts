import { DynamicModule, Module, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./loaders.module-definition"
import { UsersLoaderService } from "./users-loader.service"
import { BotsLoaderService } from "./bots-loader.service"

@Module({})
export class LoadersModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            UsersLoaderService,
            BotsLoaderService,
        ]
        return {
            ...dynamicModule,
            providers: [...dynamicModule.providers || [], ...providers],
            exports: [...providers],
        }
    }
}   