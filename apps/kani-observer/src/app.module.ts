import { Module } from "@nestjs/common"
import { EnvModule } from "@modules/env"
import { WinstonLevel, WinstonModule } from "@modules/winston"
import { MixinModule } from "@modules/mixin"
import { CexesModule, ClientsModule, DexesModule } from "@modules/blockchains"
import { ScheduleModule } from "@nestjs/schedule"
import { CryptoModule } from "@modules/crypto"
import { DexId, PrimaryMongoDbModule } from "@modules/databases"
import { PythModule } from "@modules/blockchains"
import { SignersModule, SnapshotsModule, TxBuilderModule, MathModule } from "@modules/blockchains"
import { CacheModule } from "@modules/cache"
import { EventModule } from "@modules/event"
import { GcpModule } from "@modules/gcp"
import { WebsocketModule } from "@modules/websocket"
import { EventEmitterModule } from "@nestjs/event-emitter"
import { AxiosModule } from "@modules/axios"

@Module({
    imports: [
        EnvModule.forRoot(),
        WinstonModule.register({
            isGlobal: true,
            appName: "kani-observer",
            level: WinstonLevel.Info,
        }),
        EventEmitterModule.forRoot(),
        MixinModule.register({
            isGlobal: true,
        }),
        MathModule.register({
            isGlobal: true,
        }),
        GcpModule.register({
            isGlobal: true,
        }),
        WebsocketModule.register({
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
        AxiosModule.register({
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
        SnapshotsModule.register({
            isGlobal: true,
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
                // {
                //     dexId: DexId.Orca,
                //     enabled: {
                //         observe: true,
                //         action: false,
                //     },
                // },
                {
                    dexId: DexId.Meteora,
                    enabled: {
                        observe: true,
                        action: false,
                        analytics: true,
                    },
                },
                // {
                //     dexId: DexId.FlowX,
                //     enabled: {
                //         observe: true,
                //         action: false,
                //     },
                // },
                {
                    dexId: DexId.Cetus,
                    enabled: {
                        observe: true,
                        action: false,
                    },
                },
                // {
                //     dexId: DexId.Momentum,
                //     enabled: {
                //         observe: true,
                //         action: false,
                //     },
                // },
                // {
                //     dexId: DexId.Turbos,
                //     enabled: {
                //         observe: true,
                //         action: false,
                //     },
                // },
            ],
        }),
        CexesModule.register({
            isGlobal: true,
        }), 
    ],
})
export class AppModule {}
