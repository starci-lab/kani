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
    RotationModule 
} from "./rotation"
import {
    DiagnosticsModule 
} from "./diagnostics"
import {
    LockAuthorityService 
} from "./lock-authority.service"

@Module({
})
export class BussinessModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        return {
            ...dynamicModule,
            global: options.isGlobal,
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
                RotationModule.register(
                    {
                        isGlobal: options.isGlobal,
                    }
                ),
            ],
            exports: [
                LockAuthorityService,
            ],
            providers: [
                LockAuthorityService,
            ],
        }
    }
}   