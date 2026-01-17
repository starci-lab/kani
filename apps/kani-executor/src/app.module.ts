import { Module } from "@nestjs/common"
import { APP_FILTER } from "@nestjs/core"
import { ExecutorModule } from "@modules/executor"
import { WinstonLevel, WinstonModule } from "@modules/winston"
import { envConfig, EnvModule } from "@modules/env"
import { DexId, PrimaryMongoDbModule } from "@modules/databases"
import { ScheduleModule } from "@nestjs/schedule"
import { EventModule, EventName } from "@modules/event"
import { EventEmitterModule } from "@nestjs/event-emitter"
import { 
    ClientsModule, 
    DexesModule, 
    SignersModule, 
    MathModule,
    FormulasModule,
} from "@modules/blockchains"
import { CacheModule } from "@modules/cache"
import { CryptoModule } from "@modules/crypto"
import { AggregatorsModule } from "@modules/blockchains"
import { LeaseModule, SemaModule } from "@modules/lock"
import { 
    TxBuilderModule, 
    ExitStrategyEngineModule, 
    BalanceModule, 
    SnapshotsModule 
} from "@modules/blockchains"
import { GcpModule } from "@modules/gcp"
import { SpinnerModule } from "@modules/topcli"
import { BullModule } from "@modules/bullmq"
import { MixinModule } from "@modules/mixin"
import { AxiosModule } from "@modules/axios"
import { ApolloClientModule } from "@modules/apollo-client"
import { TerminusModule, DependencyName } from "@modules/terminus"
import { FilesystemModule } from "@modules/filesystem"
import { P2CBalancerModule } from "@modules/p2c-balancer"
import { SentryCatchAllExceptionFilter, SentryModule } from "@modules/sentry"
import { DerivedModule } from "@modules/derived"
import { KafkaMode } from "@modules/event"
import { PrivyModule } from "@modules/privy"
import { StreamAsyncIteratorModule } from "@modules/stream-async-iterator"

@Module({
    imports: [
        EnvModule.forRoot(),
        FilesystemModule.register({
            isGlobal: true,
        }),
        SentryModule.register({
            isGlobal: true,
        }),
        SemaModule.register({
            isGlobal: true,
        }),
        StreamAsyncIteratorModule.register({
            isGlobal: true,
        }),
        EventEmitterModule.forRoot(),
        WinstonModule.register({
            isGlobal: true,
            appName: `Kani Executor ${envConfig().executor.id}`,
            level: WinstonLevel.Verbose,
        }),
        FormulasModule.register({
            isGlobal: true,
        }),
        ExitStrategyEngineModule.register({
            isGlobal: true,
        }),
        PrimaryMongoDbModule.register({
            isGlobal: true,
            withSeeders: true,
            memoryStorage: true,
        }),
        PrivyModule.register({
            isGlobal: true,
        }),
        CacheModule.register({
            isGlobal: true,
        }),
        AxiosModule.register({
            isGlobal: true,
        }),
        ApolloClientModule.register({
            isGlobal: true,
        }),
        MixinModule.register({
            isGlobal: true,
        }),
        ClientsModule.register({
            isGlobal: true,
        }),
        DerivedModule.register({
            isGlobal: true,
        }),
        SignersModule.register({
            isGlobal: true,
        }),
        BullModule.forRoot({
            isGlobal: true,
        }),
        P2CBalancerModule.register({
            isGlobal: true,
        }),
        GcpModule.register({
            isGlobal: true,
        }),
        BalanceModule.register({
            isGlobal: true,
        }),
        CryptoModule.register({
            isGlobal: true,
        }),
        ScheduleModule.forRoot(),
        AggregatorsModule.register({
            isGlobal: true,
        }),
        SpinnerModule.register({
            isGlobal: true,
        }),
        LeaseModule.register({
            isGlobal: true,
        }),
        TxBuilderModule.register({
            isGlobal: true,
        }),
        EventModule.register({
            kafka: {
                modes: [KafkaMode.Consumer],
                kafkaTopics: [
                    EventName.ReinitializeBalancers,
                    EventName.ClmmLiquidityPoolsFetched,
                    EventName.DlmmLiquidityPoolsFetched,
                ],
            },
            isGlobal: true,
        }),
        SnapshotsModule.register({
            isGlobal: true,
        }),
        MathModule.register({
            isGlobal: true,
        }),
        DexesModule.register({
            isGlobal: true,
            dexIds: [
                DexId.Raydium,
                DexId.Orca,
                DexId.Meteora,
                DexId.FlowX,
                DexId.Cetus,
                DexId.Turbos,
                DexId.Momentum,
            ],
            enabled: {
                observe: false,
                action: true,
                fees: false,
                analytics: false,
            },
        }),
        ExecutorModule.register({
            isGlobal: true,
        }),
        TerminusModule.register({
            isGlobal: true,
            dependencies: [
                DependencyName.MongodbPrimary,
                DependencyName.CacheRedis,
                DependencyName.AdapterRedis,
                DependencyName.ThrottlerRedis,
                DependencyName.Kafka,
            ],
        }),
    ],
    providers: [
        {
            provide: APP_FILTER,
            useClass: SentryCatchAllExceptionFilter,
        },
    ],
})
export class AppModule {}
