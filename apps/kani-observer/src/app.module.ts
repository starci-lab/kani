import { Module } from "@nestjs/common"
import { APP_FILTER } from "@nestjs/core"
import { EnvModule } from "@modules/env"
import { WinstonLevel, WinstonModule } from "@modules/winston"
import { MixinModule } from "@modules/mixin"
import { CexesModule, ClientsModule, DexesModule } from "@modules/blockchains"
import { ScheduleModule } from "@nestjs/schedule"
import { CryptoModule } from "@modules/crypto"
import { DexId, PrimaryMongoDbModule } from "@modules/databases"
import { PythModule, SpotModule } from "@modules/blockchains"
import { 
    SignersModule, 
    SnapshotsModule, 
    TxBuilderModule, 
    MathModule,
    FormulasModule 
} from "@modules/blockchains"
import { CacheModule } from "@modules/cache"
import { EventModule } from "@modules/event"
import { GcpModule } from "@modules/gcp"
import { EventEmitterModule } from "@nestjs/event-emitter"
import { AxiosModule } from "@modules/axios"
import { ApolloClientModule } from "@modules/apollo-client"
import { FilesystemModule } from "@modules/filesystem"
import { DependencyName, TerminusModule } from "@modules/terminus"
import { P2CBalancerModule } from "@modules/p2c-balancer"
import { SentryCatchAllExceptionFilter, SentryModule } from "@modules/sentry"
import { SealedModule } from "@modules/sealed"

@Module({
    imports: [
        EnvModule.forRoot(),
        FilesystemModule.register({
            isGlobal: true,
        }),
        SentryModule.register({
            isGlobal: true,
        }),

        WinstonModule.register({
            isGlobal: true,
            appName: "kani-observer",
            level: WinstonLevel.Info,
        }),
        FormulasModule.register({
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
        PrimaryMongoDbModule.register({
            isGlobal: true,
            withSeeders: true,
            memoryStorage: true,
        }),
        CacheModule.register({
            isGlobal: true,
        }),
        EventModule.register({
            isGlobal: true,
            kafka: {
                createTopics: true,
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
        SealedModule.register({
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
        ScheduleModule.forRoot(),
        ClientsModule.register({
            isGlobal: true,
        }),
        PythModule.register({
            isGlobal: true,
        }),
        SpotModule.register({
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
            dexes: [
                {
                    dexId: DexId.Raydium,
                    enabled: {
                        observe: true,
                        action: false,
                        analytics: true,
                    },
                },
                {
                    dexId: DexId.Orca,
                    enabled: {
                        observe: true,
                        action: false,
                        analytics: true,
                    },
                },
                {
                    dexId: DexId.Meteora,
                    enabled: {
                        observe: true,
                        action: false,
                        analytics: true,
                    },
                },
                {
                    dexId: DexId.FlowX,
                    enabled: {
                        observe: true,
                        action: false,
                    },
                },
                {
                    dexId: DexId.Cetus,
                    enabled: {
                        observe: true,
                        action: false,
                        analytics: true,
                    },
                },
                {
                    dexId: DexId.Momentum,
                    enabled: {
                        observe: true,
                        action: false,
                        analytics: true,
                    },
                },
                {
                    dexId: DexId.Turbos,
                    enabled: {
                        observe: true,
                        action: false,
                        analytics: true,
                    },
                },
            ],
        }),
        CexesModule.register({
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
