import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./app.module-definition"
import { envConfig, EnvModule } from "@modules/env"
import { PriceFetcherModule } from "./price-fetcher"
import { WinstonLevel, WinstonModule } from "@modules/winston"
import { AxiosModule } from "@modules/axios"
import { PriceModule, LpPoolsModule } from "@modules/blockchains"
import { MixinModule } from "@modules/mixin"
import { ScheduleModule } from "@nestjs/schedule"
import { MongooseModule } from "@modules/databases"
import { EventModule } from "@modules/event"
import { CacheModule } from "@modules/cache"
import { PoolSelectorModule } from "./pool-selector"

@Module({})
export class AppModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const modules: Array<DynamicModule> = []
        // we push price fetcher module if enabled in env
        modules.push(...[
            ScheduleModule.forRoot(),
            EnvModule.forRoot(),
            EventModule.register({
                isGlobal: true,
            }),
            MixinModule.register({
                isGlobal: true,
            }),
            AxiosModule.register({
                isGlobal: true,
            }),
            WinstonModule.register({
                isGlobal: true,
                appName: envConfig().lpBot.appName,
                level: WinstonLevel.Debug,
            }),
            CacheModule.register({
                isGlobal: true,
            }),
            MongooseModule.register({
                withSeeders: true,
                withMemDb: true,
                isGlobal: true,
            }),
            PriceModule.register({
                isGlobal: true,
            }),
            LpPoolsModule.register({
                isGlobal: true,
            }),
            PoolSelectorModule.register({
                isGlobal: true,
            }),
        ])
        if (envConfig().lpBot.enablePriceFetcher) {
            modules.push(
                PriceFetcherModule.register({
                    isGlobal: true
                })
            )
        }
        return {
            ...dynamicModule,
            imports: [
                ...modules,
            ],
        }
    }
}
