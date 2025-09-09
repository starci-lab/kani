// app.module.ts
import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./binance.module-definition"   
import { BinanceWsService } from "./binance-ws.service"
import { BinanceRestService } from "./binance-rest.service"
import { BinanceProcessorService } from "./binance-processor.service"

@Module({})
export class BinanceModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers = [
            BinanceWsService,
            BinanceRestService,
            BinanceProcessorService,
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