import { Module } from "@nestjs/common"
import { CommandsModule } from "@modules/commands"
import { EnvModule } from "@modules/env"
import { WinstonLevel, WinstonModule } from "@modules/winston"
import { PrimaryMongoDbModule } from "@modules/databases"
import { GoogleapisModule } from "@modules/googleapis"
import { ExecaModule } from "@modules/execa"
import { FilesystemModule } from "@modules/filesystem"
import { MixinModule } from "@modules/mixin"
import { CryptoModule } from "@modules/crypto"
@Module({
    imports: [
        EnvModule.forRoot(),
        WinstonModule.register({
            isGlobal: true,
            appName: "kani-cli",
            level: WinstonLevel.Info,
        }),
        MixinModule.register({
            isGlobal: true,
        }),
        FilesystemModule.register({
            isGlobal: true,
        }),
        CryptoModule.register({
            isGlobal: true,
        }),
        ExecaModule.register({
            isGlobal: true,
        }),
        GoogleapisModule.register({
            isGlobal: true,
        }),
        PrimaryMongoDbModule.register({
            isGlobal: true,
            memoryStorage: false,
            withSeeders: false,
        }),
        CommandsModule.register({
            isGlobal: true,
        }),
    ],
})
export class AppModule {}
