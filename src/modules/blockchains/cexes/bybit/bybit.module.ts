import {
    DynamicModule, Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./bybit.module-definition"   
import {
    BybitLastPriceService 
} from "./last-price.service"
import {
    BybitOrderBookService 
} from "./order-book.service"
import {
    BybitTokenRegistryService 
} from "./token-registry.service"

@Module({
})
export class BybitModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers = [
            BybitLastPriceService,
            BybitOrderBookService,
            BybitTokenRegistryService,
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


