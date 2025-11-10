import { Module } from "@nestjs/common"
import { HttpModule } from "@modules/interfaces"
import { PassportModule } from "@modules/passport"
import { EnvModule } from "@modules/env"
import { WinstonLevel, WinstonModule } from "@modules/winston"
import { MixinModule } from "@modules/mixin"
import { MongooseModule } from "@nestjs/mongoose"

@Module({
    imports: [
        EnvModule.forRoot(),
        WinstonModule.register({
            isGlobal: true,
            appName: "kani-interface",
            level: WinstonLevel.Info,
        }),
        MixinModule.register({
            isGlobal: true,
        }),
        MongooseModule.register({
            isGlobal: true,
            withMemDb: true,
        }),
        PassportModule.register({
            isGlobal: true,
        }),
        HttpModule.register({
            isGlobal: true,
        }),
    ],
})
export class AppModule {}
