import { ClientsModule, DexesModule, KeypairsModule, PriceModule, PythModule, SignersModule, SwapModule, UtilsModule } from "@modules/blockchains"
import { Module } from "@nestjs/common"
import { DataLikeModule, PoolFetcherModule, PriceFetcherModule, UserLoaderModule } from "@features/fetchers"
// import { TestSwapService } from "./test-swap.service"
import { SqliteModule } from "@modules/databases"
import { CryptoModule } from "@modules/crypto"
import { EnvModule } from "@modules/env"
import { MixinModule } from "@modules/mixin"
import { WinstonLevel, WinstonModule } from "@modules/winston"
import { AxiosModule } from "@modules/axios"
import { CacheModule, CacheType } from "@modules/cache"
import { EventModule, EventType } from "@modules/event"
import { InitializerModule } from "@modules/initializer"
import { MmtTestLiquidityManangementService } from "./mmt-test-liquidity-manager.service"
import { TestSwapService } from "./test-swap.service"

@Module({
    imports: [
        EnvModule.forRoot(),
        MixinModule.register({
            isGlobal: true
        }),
        UtilsModule.register({
            isGlobal: true
        }),
        WinstonModule.register({
            isGlobal: true,
            appName: "test-fn",
            level: WinstonLevel.Info,
        }),
        CacheModule.register({
            isGlobal: true,
            types: [CacheType.Memory],
        }),
        EventModule.register({
            isGlobal: true,
            types: [EventType.Internal]
        }),
        ClientsModule.register({
            isGlobal: true,
        }),
        CryptoModule.register({
            isGlobal: true
        }),
        InitializerModule.register({
            isGlobal: true,
            loadServices: []
        }),
        SqliteModule.register({
            withSeeders: true,
            isGlobal: true,
        }),
        KeypairsModule.register({
            isGlobal: true
        }),
        SignersModule.register({
            isGlobal: true
        }),
        UserLoaderModule.register({
            isGlobal: true,
        }),
        PythModule.register({
            isGlobal: true
        }),
        DexesModule.register({
            isGlobal: true,
            useGcpKms: false,
        }),
        SwapModule.register({
            isGlobal: true
        }),
        AxiosModule.register({
            isGlobal: true
        }),
        PriceModule.register({
            isGlobal: true
        }),
        DataLikeModule.register({
            isGlobal: true,
        }),
        PriceFetcherModule.register({
            isGlobal: true
        }),
        PoolFetcherModule.register({
            isGlobal: true
        })
    ],
    providers: [
        TestSwapService
        //TurbosTestLiquidityManangementService
        //CetusTestLiquidityManangementService
        //MmtTestLiquidityManangementService
    ],
})
export class AppModule {}
