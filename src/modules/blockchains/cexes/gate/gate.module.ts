import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./gate.module-definition"
import { GateLastPriceService } from "./gate-last-price.service"
import { GateOrderBookService } from "./gate-order-book"

@Module({})
export class GateModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers = [
            GateLastPriceService,
            GateOrderBookService,
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


