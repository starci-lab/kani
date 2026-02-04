import {
    DynamicModule, Module, Provider 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./orchestrator.module-definition"
import {
    ClosePositionEnqueueService
} from "./close-position-enqueue.service"
import {
    ClosePositionActionService
} from "./close-position-action.service"
import {
    OpenPositionEnqueueService
} from "./open-position-enqueue.service"
import {
    OpenPositionActionService
} from "./open-position-action.service"
import {
    ReservesWithFeesActionService
} from "./reserves-with-fees-action.service"
import {
    LiquidityPoolStateService
} from "./liquidity-pool-state.service"

@Module({
})
export class OrchestratorModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = []
        
        // Always add base services
        providers.push(
            LiquidityPoolStateService,
        )
        
        // Add enqueue services if enabled
        const enqueueEnabled = typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" 
                ? true 
                : (typeof options.enabled.action === "boolean"
                    ? options.enabled.action
                    : (options.enabled.action?.enqueue ?? true)))
        
        if (enqueueEnabled) {
            providers.push(
                ClosePositionEnqueueService,
                OpenPositionEnqueueService,
            )
        }
        
        // Add action services if enabled
        const actionEnabled = typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" 
                ? true 
                : (typeof options.enabled.action === "boolean"
                    ? options.enabled.action
                    : (options.enabled.action?.action ?? true)))
        
        if (actionEnabled) {
            providers.push(
                ClosePositionActionService,
                OpenPositionActionService,
            )
        }
        
        // Add reserves with fees service if enabled
        const reservesWithFeesEnabled = typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.reservesWithFees ?? true))
        
        if (reservesWithFeesEnabled) {
            providers.push(
                ReservesWithFeesActionService,
            )
        }
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
