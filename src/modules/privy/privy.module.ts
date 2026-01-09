import { DynamicModule, Module, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./privy.module-definition"
import { createPrivyClientProvider } from "./privy.providers"
import { PrivyWalletService } from "./privy-wallet.service"

@Module({})
export class PrivyModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            createPrivyClientProvider(),
            PrivyWalletService,
        ]
        return {
            ...dynamicModule,
            providers: [...dynamicModule.providers || [], ...providers],
            exports: [...providers],
        }
    }
}
