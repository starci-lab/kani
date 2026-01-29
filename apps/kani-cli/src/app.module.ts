import {
    Module 
} from "@nestjs/common"
import {
    CommandsModule 
} from "@modules/commands"
import {
    EnvModule 
} from "@modules/env"
import {
    WinstonLevel, WinstonModule 
} from "@modules/winston"
import {
    PrimaryMongoDbModule 
} from "@modules/databases"
import {
    ExecaModule 
} from "@modules/execa"
import {
    FilesystemModule 
} from "@modules/filesystem"
import {
    MixinModule 
} from "@modules/mixin"
import {
    CryptoModule 
} from "@modules/crypto"
import {
    GcpModule 
} from "@modules/gcp"
import {
    DerivedModule 
} from "@modules/derived"
import {
    CacheModule 
} from "@modules/cache"

@Module({
    imports: [
        EnvModule.forRoot(),
        WinstonModule.register({
            isGlobal: true,
            appName: "Kani CLI",
            level: WinstonLevel.Info,
        }),
        MixinModule.register({
            isGlobal: true,
        }),
        FilesystemModule.register({
            isGlobal: true,
        }),
        GcpModule.register({
            isGlobal: true,
        }),
        CryptoModule.register({
            isGlobal: true,
        }),
        DerivedModule.register({
            isGlobal: true,
        }),
        ExecaModule.register({
            isGlobal: true,
        }),
        GcpModule.register({
            isGlobal: true,
        }),
        CacheModule.register({
            isGlobal: true,
        }),
        PrimaryMongoDbModule.register({
            isGlobal: true,
            memoryStorage: true,
            withSeeders: {
                manualSeed: true,
            },
            associate: true,
        }),
        CommandsModule.register({
            isGlobal: true,
        }),
    ],
})
export class AppModule {}
