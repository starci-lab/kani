import { Module } from "@nestjs/common"
//import { ComputeSwapAmountsService } from "./compute-swap-amounts.service"
import { BalanceModule, CexesModule, ClientsModule, CoingeckoModule, CoinMarketCapModule, DexesModule, ExitStrategyEngineModule, FormulasModule, MathModule, SignersModule, SpotModule, TxBuilderModule } from "@modules/blockchains"
import { EnvModule } from "@modules/env"
import { FilesystemModule } from "@modules/filesystem"
import { MixinModule } from "@modules/mixin"
import { DexId, PrimaryMongoDbModule } from "@modules/databases"
import { PythModule } from "@modules/blockchains"
import { CacheModule } from "@modules/cache"
import { EventModule } from "@modules/event"
import { EventEmitterModule } from "@nestjs/event-emitter"
import { WinstonModule, WinstonLevel } from "@modules/winston"
import { AxiosModule } from "@modules/axios"
import { RpcTestsService } from "./rpc-tests.service"
import { P2CBalancerModule } from "@modules/p2c-balancer"
import { BullModule } from "@modules/bullmq"
import { LeaseModule } from "@modules/lock"
import { CryptoModule } from "@modules/crypto"
import { DerivedModule } from "@modules/derived"
import { GcpModule } from "@modules/gcp"
import { PrivyModule } from "@modules/privy"
import { ApolloClientModule } from "@modules/apollo-client"
import { FeesTestService } from "./fees-test.service"

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
        GcpModule.register({
            isGlobal: true,
        }),
        CryptoModule.register({
            isGlobal: true,
        }),
        DerivedModule.register({
            isGlobal: true,
        }),
        PrivyModule.register({
            isGlobal: true,
        }),
        AxiosModule.register({
            isGlobal: true,
        }),
        ApolloClientModule.register({
            isGlobal: true,
        }),
        SignersModule.register({
            isGlobal: true,
        }),
        TxBuilderModule.register({
            isGlobal: true,
        }),
        LeaseModule.register({
            isGlobal: true,
        }),
        ExitStrategyEngineModule.register({
            isGlobal: true,
        }),
        BalanceModule.register({
            isGlobal: true,
            utilitiesOnly: true,
        }),
        PythModule.register({
            isGlobal: true,      
        }),
        BullModule.forRoot({
            isGlobal: true,
        }),
        DexesModule.register({
            isGlobal: true,
            dexIds: [
                DexId.Cetus,
                DexId.Turbos,
                DexId.Momentum,
                DexId.FlowX,
                DexId.Raydium,
                DexId.Orca,
                DexId.Meteora,
                DexId.Saros,
            ],
            enabled: {
                fees: true,
            },
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
        // RpcTestsService,
        FeesTestService,
    ],
})
export class AppModule {}
