import { Module } from "@nestjs/common"
//import { ComputeSwapAmountsService } from "./compute-swap-amounts.service"
import { CexesModule, ClientsModule, CoingeckoModule, CoinMarketCapModule, FormulasModule, MathModule, SpotModule } from "@modules/blockchains"
import { EnvModule } from "@modules/env"
import { FilesystemModule } from "@modules/filesystem"
import { MixinModule } from "@modules/mixin"
import { PrimaryMongoDbModule } from "@modules/databases"
import { PythModule } from "@modules/blockchains"
import { CacheModule } from "@modules/cache"
import { EventModule } from "@modules/event"
import { EventEmitterModule } from "@nestjs/event-emitter"
import { WinstonModule, WinstonLevel } from "@modules/winston"
import { AxiosModule } from "@modules/axios"
import { RpcTestsService } from "./rpc-tests.service"
import { P2CBalancerModule } from "@modules/p2c-balancer"

@Module({
    imports: [
        EnvModule.forRoot(),
        FilesystemModule.register({
            isGlobal: true,
        }),
        PrimaryMongoDbModule.register({
            isGlobal: true,
            memoryStorage: true,
        }),
        WinstonModule.register({
            isGlobal: true,
            appName: "kani-algorithm-tests",
            level: WinstonLevel.Info,
        }),
        CacheModule.register({
            isGlobal: true,
        }),
        CexesModule.register({
            isGlobal: true,
        }),
        AxiosModule.register({
            isGlobal: true,
        }),
        EventEmitterModule.forRoot(),
        EventModule.register({
            isGlobal: true,
        }),
        P2CBalancerModule.register({
            isGlobal: true,
        }),
        ClientsModule.register({
            isGlobal: true,
        }),
        PythModule.register({
            isGlobal: true,      
        }),
        CoingeckoModule.register({
            isGlobal: true,
        }),
        CoinMarketCapModule.register({
            isGlobal: true,
        }),
        MixinModule.register({
            isGlobal: true,
        }),
        SpotModule.register({
            isGlobal: true,
        }),
        FormulasModule.register({
            isGlobal: true,
        }),
        MathModule.register({
            isGlobal: true,
        }),
    ],
    providers: [
        //ComputeSwapAmountsService,
        RpcTestsService,
    ],
})
export class AppModule {}
