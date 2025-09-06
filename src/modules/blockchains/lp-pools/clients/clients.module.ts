import { DynamicModule, Module, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./clients.module-definition"
import { createSolanaClientsProvider, createSuiClientsProvider } from "./clients.providers"

@Module({})
export class ClientsModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)

        const providers: Array<Provider> = [
            createSolanaClientsProvider(),
            createSuiClientsProvider(),
        ]
        return {
            ...dynamicModule,
            providers: [
                ...dynamicModule.providers || [],
                ...providers,
            ],
            exports: [
                ...providers,
            ],
        }
    }
}