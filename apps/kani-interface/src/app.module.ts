import {
    Module 
} from "@nestjs/common"
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
    DexId, PrimaryMongoDbModule 
} from "@modules/databases"
import {
    PassportModule 
} from "@modules/passport"
import {
    DexesModule, 
    EvalModule, 
    FormulasModule, 
    KeypairsModule, 
    MathModule, 
    BalanceModule,
} from "@modules/blockchains"
import {
    CryptoModule 
} from "@modules/crypto"
import {
    GcpModule 
} from "@modules/gcp"
import {
    CodeModule 
} from "@modules/code"
import {
    TotpModule 
} from "@modules/totp"
import {
    CacheModule 
} from "@modules/cache"
import {
    InterfaceModule 
} from "@features/interface"
import {
    ThrottlerModule 
} from "@modules/throttler"
import {
    CookieModule 
} from "@modules/cookie"
import {
    SentryCatchAllExceptionFilter, SentryModule 
} from "@modules/sentry"
import {
    MailModule 
} from "@modules/mail"
import {
    ScheduleModule 
} from "@nestjs/schedule"
import {
    DependencyName, TerminusModule 
} from "@modules/terminus"
import {
    FilesystemModule 
} from "@modules/filesystem"
import {
    IoRedisInstanceKey, 
    IoRedisModule, 
    RedisInstanceKey, 
    RedisModule
} from "@modules/native"
import {
    APP_FILTER 
} from "@nestjs/core"
import {
    DerivedModule 
} from "@modules/derived"
import {
    ClientsModule, TxBuilderModule 
} from "@modules/blockchains"
import {
    P2CBalancerModule 
} from "@modules/p2c-balancer"
import {
    EventEmitterModule 
} from "@nestjs/event-emitter"
import {
    EventModule, 
    EventName
} from "@modules/event"
import {
    PrivyModule 
} from "@modules/privy"
import {
    SocketIoModule as  SocketIoCoreModule
} from "@modules/socketio"
import {
    ApolloServerModule, ApolloServerType 
} from "@modules/api"
import {
    AxiosModule 
} from "@modules/axios"
import {
    StreamAsyncIteratorModule 
} from "@modules/stream-async-iterator"

@Module({
    imports: [
        EnvModule.forRoot(),
        FilesystemModule.register({
            isGlobal: true,
        }),
        PrivyModule.register({
            isGlobal: true,
        }),
        IoRedisModule.register({
            isGlobal: true,
            instanceKeys: [
                IoRedisInstanceKey.Adapter,
            ],
        }),
        AxiosModule.register({
            isGlobal: true,
        }),
        RedisModule.register({
            isGlobal: true,
            instanceKeys: [
                RedisInstanceKey.Cache,
            ],
        }),
        StreamAsyncIteratorModule.register({
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
        ApolloServerModule.register({
            isGlobal: true,
            type: ApolloServerType.Monolithic,
            useServices: true,
        }),
        FormulasModule.register({
            isGlobal: true,
        }),
        EventEmitterModule.forRoot(),
        EventModule.register({
            isGlobal: true,
            kafka: {
                createTopicsIfNotExists: true,
                topics: [
                    EventName.ReinitializeBalancers,
                ],
            },
        }),
        SocketIoCoreModule.register({
            isGlobal: true,
        }),
        EvalModule.register({
            isGlobal: true,
        }),
        TxBuilderModule.register({
            isGlobal: true,
        }),
        P2CBalancerModule.register({
            isGlobal: true,
        }),
        ClientsModule.register({
            isGlobal: true,
        }),
        BalanceModule.register({
            isGlobal: true,
            enable: {
                fetcher: true,
                action: false,
                enqueue: false,
            },
        }),
        DexesModule.register({
            isGlobal: true,
            dexIds: [
                DexId.Orca,
                DexId.Raydium,
                DexId.Meteora,
                DexId.FlowX,
                DexId.Cetus,
                DexId.Turbos,
                DexId.Momentum,
                DexId.Saros,
            ],
            enabled: {
                observe: false,
                action: false,
                reservesWithFees: true,
                analytics: false,
            },
        }),
        WinstonModule.register({
            isGlobal: true,
            serviceName: ServiceName.KaniInterface,
            level: WinstonLevel.Info,
        }),
        SentryModule.register({
            isGlobal: true,
        }),
        PassportModule.register({
            isGlobal: true,
        }),
        CryptoModule.register({
            isGlobal: true,
        }),
        MathModule.register({
            isGlobal: true,
        }),
        CookieModule.register({
            isGlobal: true,
        }),
        SentryModule.register({
            isGlobal: true,
        }),
        ThrottlerModule.register({
            isGlobal: true,
        }),
        CodeModule.register({
            isGlobal: true,
        }),
        TotpModule.register({
            isGlobal: true,
            appName: "Kani",
        }),
        GcpModule.register({
            isGlobal: true,
        }),
        DerivedModule.register({
            isGlobal: true,
        }),
        KeypairsModule.register({
            isGlobal: true,
        }),
        MixinModule.register({
            isGlobal: true,
        }),
        ScheduleModule.forRoot(),
        MailModule.register({
            isGlobal: true,
        }),
        InterfaceModule.register({
            isGlobal: true,
        }),
        TerminusModule.register({
            isGlobal: true,
            dependencies: [
                DependencyName.Disk,
                DependencyName.Memory,
                DependencyName.Kafka,
                DependencyName.MongodbPrimary,
                DependencyName.CacheRedis,
                DependencyName.AdapterRedis,
                DependencyName.ThrottlerRedis,
            ],
        }),
    ],
    providers: [
        {
            provide: APP_FILTER,
            useClass: SentryCatchAllExceptionFilter,
        },
    ]
})
export class AppModule { }
