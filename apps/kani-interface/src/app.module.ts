import { Module } from "@nestjs/common"
import { EnvModule } from "@modules/env"
import { WinstonLevel, WinstonModule } from "@modules/winston"
import { MixinModule } from "@modules/mixin"
import { PrimaryMongoDbModule } from "@modules/databases"
import { HttpModule } from "@modules/interfaces/http"
import { PassportModule } from "@modules/passport"
import { KeypairsModule } from "@modules/blockchains"
import { CryptoModule } from "@modules/crypto"
import { GcpModule } from "@modules/gcp"
import { CodeModule } from "@modules/code"
import { TotpModule } from "@modules/totp"
import { CacheModule } from "@modules/cache"
import { GraphQLModule } from "@modules/interfaces"
import { ThrottlerModule } from "@modules/throttler"
import { CookieModule } from "@modules/cookie"
import { SentryModule } from "@modules/sentry"
import { PrivyModule } from "@modules/privy"

@Module({
    imports: [
        EnvModule.forRoot(),
        WinstonModule.register({
            isGlobal: true,
            appName: "kani-interface",
            level: WinstonLevel.Info,
        }),
        PrivyModule.register({
            isGlobal: true,
        }),
        PassportModule.register({
            isGlobal: true,
        }),
        CryptoModule.register({
            isGlobal: true,
        }),
        CookieModule.register({
            isGlobal: true,
        }),
        SentryModule.register({
            isGlobal: true,
        }),
        ThrottlerModule.register({
            isGlobal: true,
        }),
        CodeModule.register({
            isGlobal: true,
        }),
        TotpModule.register({
            isGlobal: true,
            appName: "Kani",
        }),
        CacheModule.register({
            isGlobal: true,
        }),
        GcpModule.register({
            isGlobal: true,
        }),
        KeypairsModule.register({
            isGlobal: true,
        }),
        MixinModule.register({
            isGlobal: true,
        }),
        PrimaryMongoDbModule.register({
            isGlobal: true,
            memoryStorage: true,
            withSeeders: true,
        }),
        HttpModule.register({
            isGlobal: true,
        }),
        GraphQLModule.register({
            isGlobal: true,
            useFederation: false,
            registerAllResolvers: true,
        }),
    ],
})
export class AppModule { }
