import {
    DynamicModule, Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./gate.module-definition"
import {
    GateLastPriceService 
} from "./last-price.service"
import {
    GateOrderBookService 
} from "./order-book.service"
import {
    GateTokenRegistryService 
} from "./token-registry.service"

@Module({
})
export class GateModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers = [
            GateLastPriceService,
            GateOrderBookService,
            GateTokenRegistryService,
        ]
        return {
            ...dynamicModule,
            providers: [
                ...(dynamicModule.providers || []),
                ...providers,
            ],
            exports: [
                ...providers,
            ],
        }
    }
}


