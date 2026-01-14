import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./bybit.module-definition"   
import { BybitLastPriceService } from "./bybit-last-price.service"
import { BybitOrderBookService } from "./bybit-order-book.service"
import { BybitUtilsService } from "./bybit-utils.service"

@Module({})
export class BybitModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers = [
            BybitLastPriceService,
            BybitOrderBookService,
            BybitUtilsService,
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


