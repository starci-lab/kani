import {
    Module 
} from "@nestjs/common"
import {
    APP_FILTER 
} from "@nestjs/core"
import {
    WinstonLevel, WinstonModule 
} from "@modules/winston"
import {
    envConfig,
    EnvModule,
} from "@modules/env"
import {
    DexId, 
    PrimaryInfluxdbModule, 
    PrimaryMongoDbModule 
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
    LockAuthorityModule,
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
import {
    ExecutorModule 
} from "@features/executor"
import {
    GraphModule 
} from "@modules/graph"
import {
    DebugModule
} from "@modules/debug"
import {
    ResourcesModule,
} from "@modules/resources"

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
        PrimaryInfluxdbModule.register({
            isGlobal: true,
        }),
        RedisModule.register({
            isGlobal: true,
            instanceKeys: [
                RedisInstanceKey.Cache,
            ],
        }),
        GraphModule.register({
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
            serviceName: ServiceName.KaniExecutor,
            id: envConfig().executor.id,
            level: envConfig().winston.level as WinstonLevel,
        }),
        FormulasModule.register({
            isGlobal: true,
        }),
        PrimaryMongoDbModule.register({
            isGlobal: true,
            withSeeders: {
                manualSeed: envConfig().databases.mongoose.primary.manualSeed,
            },
            memoryStorage: {
                manualLoad: envConfig().databases.mongoose.primary.manualLoad,
            },
            associate: envConfig().databases.mongoose.primary.associate,
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
        LockAuthorityModule.register({
            isGlobal: true,
        }),
        DebugModule.register({
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
            isGlobal: true,
            nats: {
                subjects: [
                    EventName.ReinitializeBalancers,
                    EventName.ClmmLiquidityPoolsSynced,
                    EventName.DlmmLiquidityPoolsSynced,
                ],
            },
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
                port: envConfig().ports.kaniExecutor,
            }
        ),
        ResourcesModule.register({
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
                // DependencyName.Nats,
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
