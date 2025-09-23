import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./app.module-definition"
import { envConfig, EnvModule, LpBotType } from "@modules/env"
import { WinstonLevel, WinstonModule } from "@modules/winston"
import { AxiosModule } from "@modules/axios"
import {
    PriceModule,
    KeypairsModule,
    DexesModule,
    ClientsModule,
    UtilsModule,
    PythModule,
    SwapModule,
    SignersModule,
} from "@modules/blockchains"
import { MixinModule } from "@modules/mixin"
import { ScheduleModule } from "@nestjs/schedule"
import { MongooseModule, SqliteModule } from "@modules/databases"
import { EventModule, EventType } from "@modules/event"
import { CacheModule, CacheType } from "@modules/cache"
import {
    PoolFetcherModule,
    PriceFetcherModule,
    CexFetcherService,
    PythFetcherService,
} from "@features/fetchers"
import { CryptoModule } from "@modules/crypto"
import { DataLikeModule, UserLoaderModule } from "@features/fetchers"
import { PoolSelectorModule, PositionExitModule } from "@features/selectors"
import { ApiModule } from "./api"
import { InitializerModule } from "@modules/initializer"

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
                InitializerModule.register({
                    isGlobal: true,
                    loadServices: [
                        PythFetcherService.name, 
                        CexFetcherService.name
                    ],
                }),
                ClientsModule.register({
                    isGlobal: true,
                }),
                UtilsModule.register({
                    isGlobal: true,
                }),
                PythModule.register({
                    isGlobal: true,
                }),
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
                    level: WinstonLevel.Info,
                }),
                CacheModule.register({
                    isGlobal: true,
                    types:
            envConfig().lpBot.type === LpBotType.UserBased
                ? [CacheType.Memory, CacheType.Redis]
                : [CacheType.Memory],
                }),
                SignersModule.register({
                    isGlobal: true,
                }),
                PriceModule.register({
                    isGlobal: true,
                }),
                SwapModule.register({
                    isGlobal: true,
                }),
                DexesModule.register({
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
                UserLoaderModule.register({
                    isGlobal: true,
                }),
                DataLikeModule.register({
                    isGlobal: true,
                }),
                PoolFetcherModule.register({
                    isGlobal: true,
                }),
                PoolSelectorModule.register({
                    isGlobal: true,
                }),
                PositionExitModule.register({
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
        if (envConfig().lpBot.type === LpBotType.System) {
            modules.push(
                ApiModule.register({
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
