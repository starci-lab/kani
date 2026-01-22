import {
    DynamicModule, Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./bussiness.module-definition"
import {
    SubscriptionsModule 
} from "./subscriptions"
import {
    DiagnosticsModule 
} from "./diagnostics"

@Module({
})
export class BussinessModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        return {
            ...dynamicModule,
            imports: [
                DiagnosticsModule.register(
                    {
                        isGlobal: options.isGlobal,
                    }
                ),
                SubscriptionsModule.register(
                    {
                        isGlobal: options.isGlobal,
                    }
                ),
            ],
        }
    }
}   