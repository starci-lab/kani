import {
    Module 
} from "@nestjs/common"
import {
    APP_FILTER 
} from "@nestjs/core"
import {
    ExecutorModule 
} from "@modules/executor"
import {
    WinstonLevel, WinstonModule 
} from "@modules/winston"
import {
    envConfig, EnvModule 
} from "@modules/env"
import {
    DexId, PrimaryMongoDbModule 
} from "@modules/databases"
import {
    ScheduleModule 
} from "@nestjs/schedule"
import {
    EventModule, EventName 
} from "@modules/event"
import {
    EventEmitterModule 
} from "@nestjs/event-emitter"
import { 
    ClientsModule, 
    DexesModule, 
    SignersModule, 
    MathModule,
    FormulasModule,
    SettlementModule,
    EvalModule,
    TxBuilderModule, 
    BalanceModule, 
    SnapshotsModule,
    AggregatorsModule
} from "@modules/blockchains"
import {
    CacheModule 
} from "@modules/cache"
import {
    CryptoModule 
} from "@modules/crypto"
import {
    SemaModule 
} from "@modules/lock"
import {
    GcpModule 
} from "@modules/gcp"
import {
    BullModule 
} from "@modules/bullmq"
import {
    MixinModule 
} from "@modules/mixin"
import {
    AxiosModule 
} from "@modules/axios"
import {
    TerminusModule, DependencyName 
} from "@modules/terminus"
import {
    FilesystemModule 
} from "@modules/filesystem"
import {
    P2CBalancerModule 
} from "@modules/p2c-balancer"
import {
    SentryCatchAllExceptionFilter, SentryModule 
} from "@modules/sentry"
import {
    DerivedModule 
} from "@modules/derived"
import {
    PrivyModule 
} from "@modules/privy"
import {
    StreamAsyncIteratorModule 
} from "@modules/stream-async-iterator"
import {
    IoRedisModule,
    IoRedisInstanceKey, 
    RedisModule,
    RedisInstanceKey
} from "@modules/native"
import {
    ApolloClientModule,
} from "@modules/api"
import {
    PrometheusModule, MetricName 
} from "@modules/prometheus"
import {
    ConsulModule 
} from "@modules/consul"
import {
    ServiceName 
} from "@modules/common"

@Module({
    imports: [
        EnvModule.forRoot(),
        FilesystemModule.register({
            isGlobal: true,
        }),
        SentryModule.register({
            isGlobal: true,
        }),
        IoRedisModule.register(
            {
                isGlobal: true,
                instanceKeys: [
                    IoRedisInstanceKey.LockAuthority,
                ],
            }
        ),
        RedisModule.register({
            isGlobal: true,
            instanceKeys: [
                RedisInstanceKey.Cache,
            ],
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
            serviceName: ServiceName.KaniExecutor,
            id: envConfig().executor.id,
            level: WinstonLevel.Verbose,
        }),
        FormulasModule.register({
            isGlobal: true,
        }),
        PrimaryMongoDbModule.register({
            isGlobal: true,
            withSeeders: {
                manualSeed: false,
            },
            memoryStorage: {
                manualLoad: true,
            },
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
        SettlementModule.register({
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
        TxBuilderModule.register({
            isGlobal: true,
        }),
        EventModule.register({
            kafka: {
                createTopicsIfNotExists: true,
                useConsume: true,
                usePublish: false,
                topics: [
                    EventName.ReinitializeBalancers,
                    EventName.ClmmLiquidityPoolsSynced,
                    EventName.DlmmLiquidityPoolsSynced,
                ],
                serviceName: ServiceName.KaniExecutor,
                id: envConfig().executor.id,
            },
            isGlobal: true,
        }),
        EvalModule.register({
            isGlobal: true,
        }),
        SnapshotsModule.register({
            isGlobal: true,
        }),
        PrometheusModule.register(
            {
                isGlobal: true,
                metricNames: [
                    MetricName.BotCount,
                ],
            }
        ),
        ConsulModule.register(
            {
                isGlobal: true,
                serviceName: ServiceName.KaniExecutor,
                enablePrometheusDnsDiscovery: true,
                id: envConfig().executor.id,
                port: envConfig().ports.kaniExecutor,
            }
        ),
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
                reservesWithFees: false,
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
                DependencyName.ThrottlerRedis,
                DependencyName.Kafka,
                DependencyName.Memory,
                DependencyName.Disk,
                DependencyName.LockAuthorityRedis,
                DependencyName.BullmqRedis,
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
