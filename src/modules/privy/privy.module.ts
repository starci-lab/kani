import {
    DynamicModule, Module, Provider 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./privy.module-definition"
import {
    createPrivyClientProvider 
} from "./privy.providers"
import {
    PrivySignService 
} from "./privy-sign.service"
import {
    PrivyCoreService 
} from "./privy-core.service"
import {
    JwtPrivyStrategy 
} from "./strategies"

/**
 * Module for the Privy service.
 */
@Module({
})
export class PrivyModule extends ConfigurableModuleClass {
    /**
     * Register the Privy module.
     * @param options - The options for the Privy module.
     * @returns The DynamicModule for the Privy module.
     */
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            createPrivyClientProvider(),
            PrivyCoreService,
            PrivySignService,
            JwtPrivyStrategy,
        ]
        return {
            ...dynamicModule,
            providers: [...dynamicModule.providers || [],
                ...providers],
            exports: [...providers],
        }
    }
}
