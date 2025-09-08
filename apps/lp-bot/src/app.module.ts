import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./app.module-definition"
import { envConfig, EnvModule, LpBotType } from "@modules/env"
import { WinstonLevel, WinstonModule } from "@modules/winston"
import { AxiosModule } from "@modules/axios"
import { PriceModule, LiquidityPoolsModule, KeypairsModule } from "@modules/blockchains"
import { MixinModule } from "@modules/mixin"
import { ScheduleModule } from "@nestjs/schedule"
import { MongooseModule, SqliteModule } from "@modules/databases"
import { EventModule } from "@modules/event"
import { CacheModule, CacheType } from "@modules/cache"
import { EventType } from "@modules/event/types"
import { PriceFetcherModule } from "@features/fetchers"
import { CryptoModule } from "@modules/crypto"
import { UserFetcherModule } from "@features/fetchers/user-fetcher"

@Module({})
export class AppModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        const modules: Array<DynamicModule> = []
        // we push price fetcher module if enabled in env
        modules.push(
            ...[
                ScheduleModule.forRoot(),
                EnvModule.forRoot(),
                EventModule.register({
                    isGlobal: true,
                    types:
            envConfig().lpBot.type === LpBotType.UserBased
                ? [EventType.Internal, EventType.Kafka]
                : [EventType.Internal],
                }),
                MixinModule.register({
                    isGlobal: true,
                }),
                CryptoModule.register({
                    isGlobal: true,
                }),
                KeypairsModule.register({
                    isGlobal: true,
                    useGcpKms: envConfig().lpBot.type === LpBotType.UserBased,
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
                    types:
            envConfig().lpBot.type === LpBotType.UserBased
                ? [CacheType.Memory, CacheType.Redis]
                : [CacheType.Memory],
                }),
                PriceModule.register({
                    isGlobal: true,
                }),
            ],
        )

        switch (envConfig().lpBot.type) {
        case LpBotType.UserBased:
            modules.push(
                MongooseModule.register({
                    withSeeders: true,
                    withMemDb: true,
                    isGlobal: true,
                }),
            )
            break
        case LpBotType.System:
            modules.push(
                SqliteModule.register({
                    withSeeders: true,
                    isGlobal: true,
                }),
            )
            break
        }

        modules.push(
            ...[
                UserFetcherModule.register({
                    isGlobal: true,
                }),
                LiquidityPoolsModule.register({
                    isGlobal: true,
                }),
            ],
        )
        if (envConfig().lpBot.enablePriceFetcher) {
            modules.push(
                PriceFetcherModule.register({
                    isGlobal: true,
                }),
            )
        }
        return {
            ...dynamicModule,
            imports: [...modules],
        }
    }
}
