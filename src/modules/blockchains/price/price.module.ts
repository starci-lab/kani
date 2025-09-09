// app.module.ts
import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./price.module-definition"   
import { CoinMarketCapService } from "./coin-market-cap.service"
import { CoinGeckoService } from "./coingekco.service"
import { BinanceModule } from "./binance"
import { AxiosModule } from "@modules/axios"
import { WinstonLevel, WinstonModule } from "@modules/winston"
import { TrendAnalyzerService } from "./trend-analyzer.service"
import { CacheModule, CacheType } from "@modules/cache"

@Module({})
export class PriceModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const baseImports = options.useSelfImports ? [
            AxiosModule.register({
                isGlobal: options.isGlobal
            }),
            WinstonModule.register({
                isGlobal: options.isGlobal,
                appName: "",
                level: WinstonLevel.Debug,
            }),
            CacheModule.register({
                isGlobal: options.isGlobal,
                types: [CacheType.Memory]
            })
        ] : []
        const modules = [
            BinanceModule.register({
                isGlobal: options.isGlobal
            }),
        ]
        const providers = [
            CoinMarketCapService,
            CoinGeckoService,
            TrendAnalyzerService
        ]
        return {
            ...dynamicModule,
            imports: [
                ...baseImports,
                ...modules,
            ],
            providers: [
                ...dynamicModule.providers || [],
                ...providers,
            ],
            exports: [
                ...modules,
                ...providers,
            ],
        }
    }
}