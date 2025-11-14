import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./subscriptions.module-definition"
import { DexSubscriptionService } from "./dex.service"
import { CexSubscriptionService } from "./cex.service"
import { PythSubscriptionService } from "./pyth.service"
@Module({})
export class SubscriptionsModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        return {
            ...dynamicModule,
            providers: [
                ...dynamicModule.providers || [], 
                CexSubscriptionService, 
                PythSubscriptionService, 
                DexSubscriptionService
            ],
            exports: [],
        }
    }
}   