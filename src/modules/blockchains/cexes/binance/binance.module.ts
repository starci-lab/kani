// app.module.ts
import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./binance.module-definition"   
import { BinanceLastPriceService } from "./binance-last-price.service"
import { BinanceOrderBookService } from "./binance-order-book.service"

@Module({})
export class BinanceModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers = [
            BinanceLastPriceService,
            BinanceOrderBookService,
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