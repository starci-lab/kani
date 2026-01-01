import { EnvModule } from "@modules/env"
import { Module } from "@nestjs/common"
import { WinstonLevel, WinstonModule } from "@modules/winston"
import { MixinModule } from "@modules/mixin"
import { P2CBalancerModule } from "@modules/p2c-balancer"
import { FilesystemModule } from "@modules/filesystem"
import { CacheModule } from "@modules/cache"
import { EventEmitterModule } from "@nestjs/event-emitter"
import { EventModule } from "@modules/event"
import { AppService } from "./app.service"
import { PrimaryMongoDbModule } from "@modules/databases"
import { ClientsModule } from "@modules/blockchains"
import { ScheduleModule } from "@nestjs/schedule"
@Module({
    imports: [
        EnvModule.forRoot(),
        WinstonModule.register({
            isGlobal: true,
            appName: "kani-test-rpc",
            level: WinstonLevel.Info,
        }),
        PrimaryMongoDbModule.register({
            withSeeders: true,
            memoryStorage: true,
            isGlobal: true,
        }),
        FilesystemModule.register({
            isGlobal: true,
        }),
        CacheModule.register({
            isGlobal: true,
        }),
        ScheduleModule.forRoot(),
        EventModule.register({
            isGlobal: true,
        }),
        EventEmitterModule.forRoot(),
        MixinModule.register({
            isGlobal: true,
        }),
        ClientsModule.register({
            isGlobal: true,
        }),
        P2CBalancerModule.register({
            isGlobal: true,
        }),
    ],
    providers: [AppService],
})
export class AppModule {}
