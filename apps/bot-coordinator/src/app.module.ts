import { Module } from "@nestjs/common"
import { EnvModule } from "@modules/env"
import { WinstonLevel, WinstonModule } from "@modules/winston"
import { MixinModule } from "@modules/mixin"
import { CryptoModule } from "@modules/crypto"

@Module({
    imports: [
        EnvModule.forRoot(),
        WinstonModule.register({
            isGlobal: true,
            appName: "bot-coordinator",
            level: WinstonLevel.Info,
        }),
        MixinModule.register({
            isGlobal: true,
        }),
        CryptoModule.register({
            isGlobal: true,
        }),
    ],
})
export class AppModule {}
