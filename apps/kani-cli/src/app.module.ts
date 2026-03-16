import {
    Module 
} from "@nestjs/common"
import {
    CliModule 
} from "@features/cli"
import {
    envConfig,
    EnvModule 
} from "@modules/env"
import {
    ServiceName,
} from "@modules/common"
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
import {
    RedisModule,
    RedisInstanceKey
} from "@modules/native"
import {
    TotpModule 
} from "@modules/totp"
import {
    PrivyModule 
} from "@modules/privy"

@Module({
    imports: [
        EnvModule.forRoot(),
        WinstonModule.register({
            isGlobal: true,
            serviceName: ServiceName.KaniCLI,
            level: envConfig().winston.level as WinstonLevel,
            useConsole: envConfig().winston.useConsole,
        }),
        MixinModule.register({
            isGlobal: true,
        }),
        FilesystemModule.register({
            isGlobal: true,
        }),
        PrivyModule.register({
            isGlobal: true,
        }),
        TotpModule.register({
            isGlobal: true,
            appName: "Kani",
        }),
        RedisModule.register({
            isGlobal: true,
            instanceKeys: [
                RedisInstanceKey.Cache,
            ],
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
        CacheModule.register({
            isGlobal: true,
        }),
        PrimaryMongoDbModule.register({
            isGlobal: true,
            memoryStorage: {
                //manualLoad: envConfig().databases.mongoose.primary.manualLoad,
                manualLoad: false,
            },
            withSeeders: {
                //manualSeed: envConfig().databases.mongoose.primary.manualSeed,
                manualSeed: false,
            },
            associate: true,
        }),
        CliModule.register({
            isGlobal: true,
        }),
    ],
})
export class AppModule {}
