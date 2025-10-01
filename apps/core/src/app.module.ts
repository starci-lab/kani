import { Module } from "@nestjs/common"
import { HttpModule } from "@interfaces/http"
import { CacheModule } from "@modules/cache"
import { EnvModule } from "@modules/env"
import { MongooseModule } from "@modules/databases"
import { PassportModule } from "@modules/passport"
import { JwtModule } from "@nestjs/jwt"
import { WinstonLevel, WinstonModule } from "@modules/winston"
import { MixinModule } from "@modules/mixin"
import { KeypairsModule, UtilsModule } from "@modules/blockchains"
import { CryptoModule } from "@modules/crypto"
import { CodeModule } from "@modules/code"
import { TotpModule } from "@modules/totp"
import { GraphQLModule } from "@interfaces/graphql"
import { ThrottlerBehindProxyGuard, ThrottlerModule } from "@modules/throttler"
import { APP_GUARD } from "@nestjs/core"
import { CookieModule } from "@modules/cookie"
import { SentryModule } from "@modules/sentry"
import { GcpModule } from "@modules/gcp"

@Module({
    imports: [
        // Load environment variables
        EnvModule.forRoot(),
        // Sentry module
        SentryModule.register({
            isGlobal: true,
        }),
        // Shared mixins/utilities
        MixinModule.register({
            isGlobal: true,
        }),
        // Throttler module
        ThrottlerModule.register({
            isGlobal: true,
        }),
        // Code generator modules
        CodeModule.register({
            isGlobal: true,
        }),
        // Authentication modules (Passport + JWT)
        JwtModule.register({
            global: true,
        }),
        PassportModule.register({
            isGlobal: true,
        }),
        // Logger (Winston)
        WinstonModule.register({
            appName: "core",
            level: WinstonLevel.Info,
            isGlobal: true,
        }),
        // Database (Mongoose)
        MongooseModule.register({
            isGlobal: true,
        }),
        // Caching (Redis / Memory)
        CacheModule.register({
            isGlobal: true,
        }),
        // Crypto modules
        CryptoModule.register({
            isGlobal: true,
        }),
        // Cookie modules
        CookieModule.register({
            isGlobal: true,
        }),
        // TOTP modules
        TotpModule.register({
            isGlobal: true,
            appName: "Kani",
        }),
        // Blockchain-related modules
        UtilsModule.register({
            isGlobal: true,
        }),
        // GCP modules
        GcpModule.register({
            isGlobal: true,
        }),
        KeypairsModule.register({
            isGlobal: true,
            useGcpKms: true,
        }),
        // HTTP API layer
        HttpModule.register({
            isGlobal: true,
        }),
        // GraphQL module
        GraphQLModule.register({
            isGlobal: true,
            // no federation
            useFederation: false,
            // register all resolvers
            registerAllResolvers: true,
        }),
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerBehindProxyGuard,
        },
    ],
})
export class AppModule {}