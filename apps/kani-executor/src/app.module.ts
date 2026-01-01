import { Module } from "@nestjs/common"
import { APP_FILTER } from "@nestjs/core"
import { ExecutorModule } from "@modules/executor"
import { WinstonLevel, WinstonModule } from "@modules/winston"
import { envConfig, EnvModule } from "@modules/env"
import { DexId, PrimaryMongoDbModule } from "@modules/databases"
import { ScheduleModule } from "@nestjs/schedule"
import { EventModule } from "@modules/event"
import { EventEmitterModule } from "@nestjs/event-emitter"
import { 
    ClientsModule, 
    DexesModule, 
    PythModule, 
    SignersModule, 
    MathModule,
    FormulasModule,
    SpotModule
} from "@modules/blockchains"
import { CacheModule } from "@modules/cache"
import { CryptoModule } from "@modules/crypto"
import { AggregatorsModule } from "@modules/blockchains"
import { MutexModule } from "@modules/lock"
import { 
    TxBuilderModule, 
    ExitStrategyEngineModule, 
    BalancesModule, 
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
        EventEmitterModule.forRoot(),
        WinstonModule.register({
            isGlobal: true,
            appName: `kani-executor-${envConfig().botExecutor.executorId}`,
            level: WinstonLevel.Verbose,
        }),
        FormulasModule.register({
            isGlobal: true,
        }),
        SpotModule.register({
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
        SealedModule.register({
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
        BalancesModule.register({
            isGlobal: true,
        }),
        CryptoModule.register({
            isGlobal: true,
        }),
        PythModule.register({
            isGlobal: true,
            utilitiesOnly: true,
        }),
        ScheduleModule.forRoot(),
        AggregatorsModule.register({
            isGlobal: true,
        }),
        SpinnerModule.register({
            isGlobal: true,
        }),
        MutexModule.register({
            isGlobal: true,
        }),
        TxBuilderModule.register({
            isGlobal: true,
        }),
        EventModule.register({
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
            withUtilities: true,
            dexes: [
                {
                    dexId: DexId.Raydium,
                    enabled: {
                        observe: false,
                        action: true,
                    },
                },
                {
                    dexId: DexId.Orca,
                    enabled: {
                        observe: false,
                        action: true,
                    },
                },
                {
                    dexId: DexId.Meteora,
                    enabled: {
                        observe: false,
                        action: true,
                    },
                },
                {
                    dexId: DexId.FlowX,
                    enabled: {
                        observe: false,
                        action: true,
                    },
                },
                {
                    dexId: DexId.Cetus,
                    enabled: {
                        observe: false,
                        action: true,
                    },
                },
                {
                    dexId: DexId.Turbos,
                    enabled: {
                        observe: false,
                        action: true,
                    },
                },
                {
                    dexId: DexId.Momentum,
                    enabled: {
                        observe: false,
                        action: true,
                    },
                },
            ],
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
