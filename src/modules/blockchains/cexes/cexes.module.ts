import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./cexes.module-definition"   
import { BinanceModule } from "./binance"
// import { GateModule } from "./gate"

@Module({})
export class CexesModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const modules = [
            BinanceModule.register({
                isGlobal: options.isGlobal
            }),
            // GateModule.register({
            //     isGlobal: options.isGlobal
            // }),
        ]
        return {
            ...dynamicModule,
            imports: [
                ...modules,
            ],
            providers: [
                ...dynamicModule.providers || [],
            ],
            exports: [
                ...modules,
            ],
        }
    }
}