import { Module } from "@nestjs/common"
import { ExecutorModule } from "@modules/executor"
import { WinstonLevel, WinstonModule } from "@modules/winston"
import { envConfig, EnvModule } from "@modules/env"
import { DexId, PrimaryMongoDbModule } from "@modules/databases"
import { MixinModule } from "@modules/mixin"
import { ScheduleModule } from "@nestjs/schedule"
import { EventModule } from "@modules/event"
import { EventEmitterModule } from "@nestjs/event-emitter"
import { 
    ClientsModule, 
    DexesModule, 
    PythModule, 
    SignersModule, 
    UtilsModule, 
    MathModule
} from "@modules/blockchains"
import { CacheModule } from "@modules/cache"
import { CryptoModule } from "@modules/crypto"
import { AggregatorsModule } from "@modules/blockchains"
import { MutexModule } from "@modules/lock"
import { BalancesModule, SnapshotsModule } from "@modules/blockchains"
import { TxBuilderModule } from "@modules/blockchains"

@Module({
    imports: [
        EnvModule.forRoot(),
        EventEmitterModule.forRoot(),
        WinstonModule.register({
            isGlobal: true,
            appName: `kani-executor-${envConfig().botExecutor.batchId}`,
            level: WinstonLevel.Info,
        }),
        MixinModule.register({
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
        ClientsModule.register({
            isGlobal: true,
        }),
        SignersModule.register({
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
        }),
        ScheduleModule.forRoot(),
        ExecutorModule.register({
            isGlobal: true,
        }),
        AggregatorsModule.register({
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
        UtilsModule.register({
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
            ],
        }),
    ],
})
export class AppModule {}
