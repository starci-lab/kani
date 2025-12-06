import { Module } from "@nestjs/common"
import { EnvModule } from "@modules/env"
import { WinstonLevel, WinstonModule } from "@modules/winston"
import { MixinModule } from "@modules/mixin"
import { ClientsModule, DexesModule } from "@modules/blockchains"
import { CacheModule } from "@modules/cache"
import { EventModule } from "@modules/event"
@Module({
    imports: [
        EnvModule.forRoot(),
        WinstonModule.register({
            isGlobal: true,
            appName: "blockchain-observer",
            level: WinstonLevel.Info,
        }),
        MixinModule.register({
            isGlobal: true,
        }),
        EventModule.register({
            isGlobal: true,
        }),
        CacheModule.register({
            isGlobal: true,
        }),
        ClientsModule.register({
            isGlobal: true,
        }),
        DexesModule.register({
            isGlobal: true,
        }),
    ],
})
export class AppModule {}
