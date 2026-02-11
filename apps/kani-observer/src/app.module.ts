import {
    Module 
} from "@nestjs/common"
import {
    APP_FILTER 
} from "@nestjs/core"
import {
    EnvModule,
    envConfig,
} from "@modules/env"
import {
    ServiceName,
} from "@modules/common"
import {
    WinstonLevel, WinstonModule 
} from "@modules/winston"
import {
    MixinModule 
} from "@modules/mixin"
import {
    CexesModule, ClientsModule, DexesModule 
} from "@modules/blockchains"
import {
    ScheduleModule 
} from "@nestjs/schedule"
import {
    CryptoModule 
} from "@modules/crypto"
import {
    DexId, PrimaryMongoDbModule 
} from "@modules/databases"
import {
    PriceFeedsModule 
} from "@modules/blockchains"
import { 
    SignersModule, 
    SnapshotsModule, 
    TxBuilderModule, 
    MathModule,
    FormulasModule 
} from "@modules/blockchains"
import {
    CacheModule 
} from "@modules/cache"
import {
    EventModule, EventName 
} from "@modules/event"
import {
    GcpModule 
} from "@modules/gcp"
import {
    EventEmitterModule 
} from "@nestjs/event-emitter"
import {
    AxiosModule 
} from "@modules/axios"
import {
    ApolloClientModule 
} from "@modules/api"
import {
    FilesystemModule 
} from "@modules/filesystem"
import {
    DependencyName, TerminusModule 
} from "@modules/terminus"
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
    StreamAsyncIteratorModule 
} from "@modules/stream-async-iterator"
import {
    IoRedisInstanceKey, IoRedisModule, 
    RedisInstanceKey, 
    RedisModule
} from "@modules/native"
import {
    ThrottlerModule 
} from "@modules/throttler"
import {
    ObserverModule 
} from "@features/observer"

@Module({
    imports: [
        EnvModule.forRoot(),
        FilesystemModule.register({
            isGlobal: true,
        }),
        SentryModule.register({
            isGlobal: true,
        }),
        ScheduleModule.forRoot(),   
        WinstonModule.register({
            isGlobal: true,
            serviceName: ServiceName.KaniObserver,
            level: envConfig().winston.level as WinstonLevel,
        }),
        IoRedisModule.register({
            isGlobal: true,
            instanceKeys: [
                IoRedisInstanceKey.Adapter,
                IoRedisInstanceKey.Throttler,
            ],
        }),
        RedisModule.register({
            isGlobal: true,
            instanceKeys: [
                RedisInstanceKey.Cache,
            ],
        }),
        ThrottlerModule.register({
            isGlobal: true,
        }),
        FormulasModule.register({
            isGlobal: true,
        }),
        StreamAsyncIteratorModule.register({
            isGlobal: true,
        }),
        EventEmitterModule.forRoot(),
        MixinModule.register({
            isGlobal: true,
        }),
        P2CBalancerModule.register({
            isGlobal: true,
        }),
        MathModule.register({
            isGlobal: true,
        }),
        CacheModule.register({
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
            associate: true,
        }),
        EventModule.register({
            isGlobal: true,
            kafka: {
                createTopicsIfNotExists: true,
                topics: [
                    EventName.ReinitializeBalancers,
                ],
            },
        }),
        TxBuilderModule.register({
            isGlobal: true,
        }),
        CryptoModule.register({
            isGlobal: true,
        }),
        GcpModule.register({
            isGlobal: true,
        }),
        DerivedModule.register({
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
        ClientsModule.register({
            isGlobal: true,
        }),
        PriceFeedsModule.register({
            isGlobal: true,
        }),
        SnapshotsModule.register({
            isGlobal: true,
        }),
        TerminusModule.register({
            isGlobal: true,
            dependencies: [
                DependencyName.MongodbPrimary,
                DependencyName.CacheRedis,
                DependencyName.AdapterRedis,
                DependencyName.ThrottlerRedis,
            ],
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
                observe: true,
                action: false,
                reservesWithFees: false,
                analytics: true,
            },
        }),
        CexesModule.register({
            isGlobal: true,
        }), 
        ObserverModule.register({
            isGlobal: true,
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
