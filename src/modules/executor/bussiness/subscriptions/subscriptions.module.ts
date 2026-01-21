import {
    DynamicModule, Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./subscriptions.module-definition"
import {
    ClmmSubscriptionService 
} from "./clmm.service"
import {
    DlmmSubscriptionService 
} from "./dlmm.service"
import {
    LiquidityPoolAssignmentsRotationService 
} from "./liquidity-pool-assignments-rotation.service"
@Module({
})
export class SubscriptionsModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        return {
            ...dynamicModule,
            providers: [
                ...dynamicModule.providers || [], 
                ClmmSubscriptionService, 
                DlmmSubscriptionService,
                LiquidityPoolAssignmentsRotationService
            ],
            exports: [],
        }
    }
}   