// app.module.ts
import {
    DynamicModule, Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./binance.module-definition"   
import {
    BinanceLastPriceService 
} from "./last-price.service"
import {
    BinanceOrderBookService 
} from "./order-book.service"
import {
    BinanceTokenRegistryService 
} from "./token-registry.service"

@Module({
})
export class BinanceModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers = [
            BinanceLastPriceService,
            BinanceOrderBookService,
            BinanceTokenRegistryService,
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